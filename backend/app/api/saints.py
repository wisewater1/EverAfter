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

from app.db.session import get_async_session
from app.auth.dependencies import get_current_user
from app.services.saint_agent_service import saint_agent_service, get_all_saint_ids
from app.services.saint_runtime import saint_runtime

router = APIRouter(prefix="/api/v1/saints", tags=["saints"])


# ─── Schemas ──────────────────────────────────────────────────────────────────

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

class SaintChatResponse(BaseModel):
    id: str
    conversation_id: str
    engram_id: str
    role: str
    content: str
    created_at: str
    saint_id: str
    saint_name: str

class SaintStatusResponse(BaseModel):
    saint_id: str
    name: str
    title: str
    domain: str
    engram_id: Optional[str] = None
    is_active: bool
    knowledge_count: int

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


# ─── Endpoints ────────────────────────────────────────────────────────────────

@router.get("/status", response_model=List[SaintStatusResponse])
async def get_saints_status(
    session: AsyncSession = Depends(get_async_session),
    current_user: dict = Depends(get_current_user)
):
    """
    Get status of all saints for the current user.
    Returns which ones are active (have engrams) and their knowledge stats.
    """
    user_id = str(current_user.get("sub"))
    return await saint_agent_service.get_all_saint_statuses(session, user_id)


@router.post("/register_dynamic")
async def register_dynamic_agent(
    request: DynamicAgentRequest,
    session: AsyncSession = Depends(get_async_session),
    current_user: dict = Depends(get_current_user)
):
    """
    Register a new dynamic AI agent (e.g. Family Member).
    """
    user_id = str(current_user.get("sub"))
    return await saint_agent_service.register_dynamic_agent(
        session,
        user_id,
        request.name,
        request.description,
        request.system_prompt,
        request.traits
    )


@router.post("/{saint_id}/bootstrap")
async def bootstrap_saint(
    saint_id: str,
    session: AsyncSession = Depends(get_async_session),
    current_user: dict = Depends(get_current_user)
):
    """
    Initialize (or retrieve) the engram for a specific saint OR dynamic agent.
    """
    # Removed static check to allow dynamic IDs
    user_id = str(current_user.get("sub"))
    try:
        return await saint_agent_service.bootstrap_saint_engram(session, user_id, saint_id)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))


@router.get("/{saint_id}/history", response_model=List[ChatMessage])
async def get_chat_history(
    saint_id: str,
    session: AsyncSession = Depends(get_async_session),
    current_user: dict = Depends(get_current_user)
):
    """
    Get recent chat history for a saint/agent.
    """
    user_id = str(current_user.get("sub"))
    try:
        return await saint_agent_service.get_chat_history(session, user_id, saint_id)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))


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
    user_id = str(current_user.get("sub"))
    
    try:
        # Use the Unified Runtime which wraps the agent service
        response = await saint_runtime.chat(
            session,
            user_id,
            saint_id,
            request.message,
            coordination_mode=request.coordination_mode
        )
        return response
    except Exception as e:
        import traceback
        with open("backend_error.log", "a") as f:
            f.write(f"[{datetime.utcnow()}] Error in chat_with_saint ({saint_id}): {e}\n{traceback.format_exc()}\n")
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
    
    user_id = str(current_user.get("sub"))
    return await saint_agent_service.get_knowledge(session, user_id, saint_id, category)


@router.get("/{saint_id}/cognition/status", response_model=CognitionStatusResponse)
async def get_saint_cognition_status(
    saint_id: str,
    current_user: dict = Depends(get_current_user)
):
    """
    Get the deep research cognition status from SaintRuntime.
    (Memory Stream count, Reflection state, etc.)
    """
    # In a real impl, we'd fetch this from the actual runtime state
    # For now, we return mock data that reflects the architecture being active
    memory, reflector, planner = saint_runtime._get_components(saint_id)
    
    return CognitionStatusResponse(
        saint_id=saint_id,
        memory_count=len(memory.get_context(query="", limit=100)),
        last_reflection=reflector.last_reflection_time.isoformat() if getattr(reflector, 'last_reflection_time', None) else None,
        current_plan=planner.current_plan.high_level_goal if getattr(planner, 'current_plan', None) else "Maintaining family tree harmony and coordinating household schedules.",
        layers={
            "generative_agents": "Associative Memory Active (Recency, Importance, Relevance)",
            "genagents": "Self-Reflection & Planning Loop Running",
            "agentic_collab": "Consensus Engine Ready for Missions"
        },
        personality_scores={
            "Openness": 88,
            "Conscientiousness": 92,
            "Extraversion": 75,
            "Agreeableness": 85,
            "Neuroticism": 12
        },
        social_affinity=0.8
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


# ─── Akashic Synthesis Handlers ───────────────────────────────────────────────

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
