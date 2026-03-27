"""
Saints API Router

Endpoints for interacting with Saint Agents:
- Bootstrap engrams for saints
- Chat with saints (with knowledge persistence)
- Retrieve saint knowledge
- Get all saint statuses
- Register dynamic family agents
- Get chat history
"""

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from typing import List, Dict, Any, Optional
from pydantic import BaseModel
from datetime import datetime
import uuid
import logging

from app.db.session import get_async_session
from app.auth.dependencies import get_current_user
from app.services.saint_agent_service import (
    SaintStorageUnavailableError,
    get_all_saint_ids,
    saint_agent_service,
)
from app.services.saint_runtime import saint_runtime
from app.services.saint_runtime.actions.engine import action_engine
from app.models.engram import ArchetypalAI
from app.models.saint import GuardianIntercession
from sqlalchemy import select

router = APIRouter(prefix="/api/v1/saints", tags=["saints"])
logger = logging.getLogger(__name__)


def _saint_not_found_error(exc: Exception) -> bool:
    detail = str(exc)
    return detail.startswith("Dynamic agent not found:") or detail.startswith("Unknown saint or invalid agent ID:")

def _current_user_uuid(current_user: dict) -> uuid.UUID:
    for key in ("sub", "id"):
        value = current_user.get(key)
        if not value:
            continue
        try:
            return uuid.UUID(str(value))
        except ValueError:
            continue

    raise HTTPException(status_code=401, detail="User ID not found in token")


# â”€â”€â”€ Schemas â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

class CognitionStatusResponse(BaseModel):
    saint_id: str
    memory_count: int
    last_reflection: Optional[str]
    current_plan: Optional[str]
    layers: Dict[str, Any]
    personality_scores: Dict[str, int]
    social_affinity: float = 0.5

class SaintChatRequest(BaseModel):
    message: str
    coordination_mode: bool = False
    context: Optional[str] = None

class SaintChatResponse(BaseModel):
    id: str
    conversation_id: str
    engram_id: str
    role: str
    content: str
    created_at: str
    saint_id: str
    saint_name: str
    degraded: bool = False
    mode: str = "full"
    persistence_available: bool = True
    history_available: bool = True
    knowledge_available: bool = True

class SaintBootstrapResponse(BaseModel):
    engram_id: str
    saint_id: str
    name: str
    is_new: bool
    degraded: bool = False
    mode: str = "full"
    persistence_available: bool = True

class SaintStatusResponse(BaseModel):
    saint_id: str
    name: str
    title: str
    domain: str
    engram_id: Optional[str] = None
    is_active: bool
    knowledge_count: int
    built_in_available: bool = True
    availability_mode: str = "full"
    persistence_available: bool = True
    history_available: bool = True
    knowledge_available: bool = True

class KnowledgeItem(BaseModel):
    id: str
    key: str
    value: str
    category: str
    confidence: float
    updated_at: Optional[str] = None

class DynamicAgentRequest(BaseModel):
    name: str
    description: str
    system_prompt: str
    traits: Dict[str, Any]

class ChatMessage(BaseModel):
    id: str
    role: str
    content: str
    timestamp: Optional[str] = None

class GuardianIntercessionResponse(BaseModel):
    id: str
    saint_id: str
    description: str
    tool_name: str
    tool_kwargs: Dict[str, Any]
    status: str
    created_at: str


# â”€â”€â”€ Endpoints â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

@router.get("/status", response_model=List[SaintStatusResponse])
async def get_saints_status(
    session: AsyncSession = Depends(get_async_session),
    current_user: dict = Depends(get_current_user)
):
    """
    Get status of all saints for the current user.
    Returns which ones are active (have engrams) and their knowledge stats.
    """
    user_id = _current_user_uuid(current_user)
    return await saint_agent_service.get_all_saint_statuses(session, user_id)

@router.get("/intercessions/pending", response_model=List[GuardianIntercessionResponse])
async def get_pending_intercessions(
    session: AsyncSession = Depends(get_async_session),
    current_user: dict = Depends(get_current_user)
):
    """Get all pending intercessions for the current user."""
    user_id = _current_user_uuid(current_user)
    query = select(GuardianIntercession).where(
        GuardianIntercession.user_id == user_id,
        GuardianIntercession.status == "pending"
    ).order_by(GuardianIntercession.created_at.desc())
    
    result = await session.execute(query)
    intercessions = result.scalars().all()
    
    return [
        GuardianIntercessionResponse(
            id=str(intercession.id),
            saint_id=intercession.saint_id,
            description=intercession.description,
            tool_name=intercession.tool_name,
            tool_kwargs=intercession.tool_kwargs,
            status=intercession.status,
            created_at=intercession.created_at.isoformat()
        ) for intercession in intercessions
    ]

@router.post("/intercessions/{intercession_id}/approve")
async def approve_intercession(
    intercession_id: str,
    session: AsyncSession = Depends(get_async_session),
    current_user: dict = Depends(get_current_user)
):
    """Approve and execute a pending intercession."""
    user_id = _current_user_uuid(current_user)
    query = select(GuardianIntercession).where(
        GuardianIntercession.id == intercession_id,
        GuardianIntercession.user_id == user_id
    )
    result = await session.execute(query)
    intercession = result.scalar_one_or_none()
    
    if not intercession:
        raise HTTPException(status_code=404, detail="Intercession not found")
        
    if intercession.status != "pending":
        raise HTTPException(status_code=400, detail="Intercession is already processed")
        
    intercession.status = "approved"
    
    # Execute the action
    if action_engine and intercession.tool_name in action_engine.tools:
        try:
            exec_result = action_engine.execute_intercession(intercession, str(user_id))
            intercession.execution_result = exec_result
            intercession.status = "executed"
        except Exception as e:
            intercession.execution_result = {"error": str(e)}
            intercession.status = "failed"
            
    await session.commit()
    return {"status": "success", "intercession_status": intercession.status}

@router.post("/intercessions/{intercession_id}/deny")
async def deny_intercession(
    intercession_id: str,
    session: AsyncSession = Depends(get_async_session),
    current_user: dict = Depends(get_current_user)
):
    """Deny a pending intercession."""
    user_id = _current_user_uuid(current_user)
    query = select(GuardianIntercession).where(
        GuardianIntercession.id == intercession_id,
        GuardianIntercession.user_id == user_id
    )
    result = await session.execute(query)
    intercession = result.scalar_one_or_none()
    
    if not intercession:
        raise HTTPException(status_code=404, detail="Intercession not found")
        
    intercession.status = "denied"
    await session.commit()
    return {"status": "success"}


@router.post("/register_dynamic")
async def register_dynamic_agent(
    request: DynamicAgentRequest,
    session: AsyncSession = Depends(get_async_session),
    current_user: dict = Depends(get_current_user)
):
    """
    Register a new dynamic AI agent (e.g. Family Member).
    """
    user_id = _current_user_uuid(current_user)
    return await saint_agent_service.register_dynamic_agent(
        session,
        user_id,
        request.name,
        request.description,
        request.system_prompt,
        request.traits
    )


@router.post("/{saint_id}/bootstrap", response_model=SaintBootstrapResponse)
async def bootstrap_saint(
    saint_id: str,
    session: AsyncSession = Depends(get_async_session),
    current_user: dict = Depends(get_current_user)
):
    """
    Initialize (or retrieve) the engram for a specific saint OR dynamic agent.
    """
    # Removed static check to allow dynamic IDs
    user_id = _current_user_uuid(current_user)
    try:
        return await saint_agent_service.bootstrap_saint_engram(session, user_id, saint_id)
    except SaintStorageUnavailableError as exc:
        raise HTTPException(status_code=503, detail=str(exc))
    except ValueError as e:
        if _saint_not_found_error(e):
            raise HTTPException(status_code=404, detail=str(e))
        logger.exception("Saint bootstrap failed for %s", saint_id)
        raise HTTPException(status_code=500, detail="Failed to bootstrap saint")
    except Exception:
        logger.exception("Saint bootstrap failed for %s", saint_id)
        raise HTTPException(status_code=500, detail="Failed to bootstrap saint")


@router.get("/{saint_id}/history", response_model=List[ChatMessage])
async def get_chat_history(
    saint_id: str,
    session: AsyncSession = Depends(get_async_session),
    current_user: dict = Depends(get_current_user)
):
    """
    Get recent chat history for a saint/agent.
    """
    user_id = _current_user_uuid(current_user)
    try:
        return await saint_agent_service.get_chat_history(session, user_id, saint_id)
    except SaintStorageUnavailableError as exc:
        raise HTTPException(status_code=503, detail=str(exc))
    except ValueError as e:
        if _saint_not_found_error(e):
            raise HTTPException(status_code=404, detail=str(e))
        logger.exception("Saint history load failed for %s", saint_id)
        raise HTTPException(status_code=500, detail="Failed to load saint history")
    except Exception:
        logger.exception("Saint history load failed for %s", saint_id)
        raise HTTPException(status_code=500, detail="Failed to load saint history")


@router.post("/{saint_id}/chat", response_model=SaintChatResponse)
async def chat_with_saint(
    saint_id: str,
    request: SaintChatRequest,
    session: AsyncSession = Depends(get_async_session),
    current_user: dict = Depends(get_current_user)
):
    """
    Send a message to a saint/agent.
    """
    # Removed static check
    user_id = _current_user_uuid(current_user)
    
    try:
        # Use the Unified Runtime which wraps the agent service
        response = await saint_runtime.chat(
            session,
            user_id,
            saint_id,
            request.message,
            coordination_mode=request.coordination_mode,
            context=request.context
        )
        return response
    except SaintStorageUnavailableError as exc:
        raise HTTPException(status_code=503, detail=str(exc))
    except Exception as e:
        logger.exception("Saint chat failed for %s", saint_id)
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/{saint_id}/knowledge", response_model=List[KnowledgeItem])
async def get_saint_knowledge(
    saint_id: str,
    category: Optional[str] = None,
    session: AsyncSession = Depends(get_async_session),
    current_user: dict = Depends(get_current_user)
):
    """
    Get what a saint knows about the user.
    """
    # Relaxed check: if it's a dynamic agent, it might have knowledge if we implemented extraction for it.
    # For now, dynamic agents might return empty knowledge.
    
    user_id = _current_user_uuid(current_user)
    try:
        return await saint_agent_service.get_knowledge(session, user_id, saint_id, category)
    except SaintStorageUnavailableError as exc:
        raise HTTPException(status_code=503, detail=str(exc))


@router.get("/{saint_id}/cognition/status", response_model=CognitionStatusResponse)
async def get_saint_cognition_status(
    saint_id: str,
    session: AsyncSession = Depends(get_async_session),
    current_user: dict = Depends(get_current_user)
):
    """
    Get the deep research cognition status from SaintRuntime.
    (Memory Stream count, Reflection state, etc.)
    """
    memory, reflector, planner = saint_runtime._get_components(saint_id)
    user_id = str(_current_user_uuid(current_user))
    bootstrap = await saint_agent_service.bootstrap_saint_engram(session, user_id, saint_id)
    engram_uuid = uuid.UUID(bootstrap["engram_id"])

    engram_query = select(ArchetypalAI).where(ArchetypalAI.id == engram_uuid)
    engram_result = await session.execute(engram_query)
    engram = engram_result.scalar_one_or_none()

    memory_items = await memory.get_context(query="", limit=100)
    personality_traits = (engram.personality_traits if engram else {}) or {}
    dimension_scores = (engram.dimension_scores if engram else {}) or {}
    ocean_scores = personality_traits.get("ocean") or personality_traits.get("ocean_scores") or {}

    def _score_from(source_key: str, fallback_key: str) -> int:
        raw = ocean_scores.get(source_key)
        if raw is None:
            raw = dimension_scores.get(fallback_key)
        if raw is None:
            return 0
        try:
            value = float(raw)
        except (TypeError, ValueError):
            return 0
        if value <= 1:
            value *= 100
        return max(0, min(100, int(round(value))))

    personality_scores = {
        "Openness": _score_from("openness", "openness"),
        "Conscientiousness": _score_from("conscientiousness", "conscientiousness"),
        "Extraversion": _score_from("extraversion", "extraversion"),
        "Agreeableness": _score_from("agreeableness", "agreeableness"),
        "Neuroticism": _score_from("neuroticism", "neuroticism"),
    }
    if not any(personality_scores.values()):
        personality_scores = {key: 0 for key in personality_scores}

    current_plan = None
    if getattr(planner, "current_plan", None):
        current_plan = getattr(planner.current_plan, "high_level_goal", None)

    training_status = engram.training_status if engram else "unknown"
    social_inputs = [personality_scores["Agreeableness"], personality_scores["Extraversion"]]
    populated_social_inputs = [score for score in social_inputs if score > 0]
    social_affinity = round(sum(populated_social_inputs) / (100 * len(populated_social_inputs)), 2) if populated_social_inputs else 0.5

    return CognitionStatusResponse(
        saint_id=saint_id,
        memory_count=len(memory_items),
        last_reflection=reflector.last_reflection_time.isoformat() if getattr(reflector, 'last_reflection_time', None) else None,
        current_plan=current_plan,
        layers={
            "memory_stream": {
                "active": True,
                "entries": len(memory_items),
            },
            "reflection_loop": {
                "active": getattr(reflector, 'last_reflection_time', None) is not None,
                "last_reflection": reflector.last_reflection_time.isoformat() if getattr(reflector, 'last_reflection_time', None) else None,
            },
            "planning_loop": {
                "active": current_plan is not None,
                "goal": current_plan,
            },
            "engram": {
                "training_status": training_status,
                "total_memories": int(getattr(engram, "total_memories", 0) or 0),
                "is_dynamic_agent": bool(personality_traits.get("is_dynamic_agent")),
            },
        },
        personality_scores=personality_scores,
        social_affinity=social_affinity
    )


@router.post("/trigger_social")
async def trigger_social_interaction(
    initiator_id: str,
    receiver_id: str,
    session: AsyncSession = Depends(get_async_session),
    current_user: dict = Depends(get_current_user)
):
    """
    Manually trigger an autonomous interaction between two dynamic agents.
    Useful for demonstrating the Autonomous Society integration.
    """
    try:
        return await saint_runtime.trigger_social(session, initiator_id, receiver_id)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# â”€â”€â”€ Akashic Synthesis Handlers â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

from app.services.saint_event_bus import saint_event_bus, HealthDeclineEvent, FinancialCrisisEvent, LifeMilestoneEvent, PersonalityDriftEvent

async def handle_health_decline(event: HealthDeclineEvent):
    """
    Handler for St. Raphael's HealthDeclineEvent.
    Triggers St. Joseph (Legacy) to run a 'Lasting Memory' reflection.
    """
    description = event.payload.get("message", "Health Decline Detected")
    severity = event.payload.get("severity", "medium")
    
    # Calculate importance based on severity
    importance_map = {"low": 5.0, "medium": 8.0, "high": 10.0, "critical": 12.0}
    importance = importance_map.get(severity, 10.0)
    
    for saint_id in saint_runtime._saint_memories.keys():
        await saint_runtime.handle_system_event(
            saint_id=saint_id,
            description=f"FAMILY EMERGENCY: {description}. Please reflect on how to support the family.",
            importance=importance
        )

# Subscribe to the event bus
saint_event_bus.subscribe("health_decline", handle_health_decline)

async def handle_financial_crisis(event: FinancialCrisisEvent):
    """
    Handler for St. Gabriel's FinancialCrisisEvent.
    Triggers St. Joseph to secure the family legacy and reassure the family.
    """
    print(f"DEBUG: St. Joseph received FinancialCrisisEvent: {event.payload}")
    for saint_id in ["joseph", "michael"]:
        await saint_runtime.handle_system_event(
            saint_id=saint_id,
            description=f"FINANCIAL ALERT: {event.payload}. Review legacy protection measures.",
            importance=10.0
        )

async def handle_life_milestone(event: LifeMilestoneEvent):
    """
    Handler for LifeMilestoneEvent.
    Triggers all saints to celebrate or advise.
    """
    print(f"DEBUG: Saints received LifeMilestoneEvent: {event.description}")
    milestone_type = event.milestone_type
    
    for saint_id in saint_runtime._saint_memories.keys():
        await saint_runtime.handle_system_event(
            saint_id=saint_id,
            description=f"LIFE MILESTONE ({milestone_type}): {event.description}. Reflect on this moment for the family history.",
            importance=9.0
        )

saint_event_bus.subscribe("financial_crisis", handle_financial_crisis)
saint_event_bus.subscribe("life_milestone", handle_life_milestone)

async def handle_personality_drift(event: PersonalityDriftEvent):
    """
    Handler for PersonalityDriftEvent.
    Updates the ArchetypalAI's OCEAN scores based on reflection sentiment.
    """
    from app.db.session import get_session_factory
    from app.models.engram import ArchetypalAI
    from sqlalchemy import select
    import uuid

    print(f"DEBUG: Applying Personality Drift for {event.source_saint} (Delta: {event.sentiment_delta})")
    
    AsyncSessionLocal = get_session_factory()
    async with AsyncSessionLocal() as session:
        try:
            # 1. Find the Engram (ArchetypalAI)
            saint_def = saint_agent_service.get_saint_definition(event.source_saint)
            if saint_def:
                query = select(ArchetypalAI).where(ArchetypalAI.name == saint_def["name"])
            else:
                 # Dynamic agent - try to find by ID
                try:
                    engram_uuid = uuid.UUID(event.source_saint)
                    query = select(ArchetypalAI).where(ArchetypalAI.id == engram_uuid)
                except ValueError:
                    print(f"Skipping drift: Invalid saint ID {event.source_saint}")
                    return

            result = await session.execute(query)
            engram = result.scalar_one_or_none()
            
            if not engram:
                print(f"Skipping drift: Engram not found for {event.source_saint}")
                return

            # 2. Update Traits
            traits = dict(engram.personality_traits) if engram.personality_traits else {}
            ocean = traits.get("ocean", {"o": 0.5, "c": 0.5, "e": 0.5, "a": 0.5, "n": 0.5})
            
            delta = event.sentiment_delta
            if delta > 0:
                ocean["o"] = min(1.0, ocean.get("o", 0.5) + delta)
                ocean["e"] = min(1.0, ocean.get("e", 0.5) + delta)
                ocean["n"] = max(0.0, ocean.get("n", 0.5) - delta)
            else:
                ocean["o"] = max(0.0, ocean.get("o", 0.5) + delta)
                ocean["c"] = min(1.0, ocean.get("c", 0.5) - delta)
                ocean["n"] = min(1.0, ocean.get("n", 0.5) - delta)
            
            traits["ocean"] = ocean
            engram.personality_traits = traits
            
            session.add(engram)
            await session.commit()
            print(f"DEBUG: Updated OCEAN for {engram.name}: {ocean}")
            
        except Exception as e:
            print(f"Error handling personality drift: {e}")
            await session.rollback()

saint_event_bus.subscribe("personality_drift", handle_personality_drift)





