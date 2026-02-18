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

from app.db.session import get_async_session
from app.auth.dependencies import get_current_user
from app.services.saint_agent_service import saint_agent_service, get_all_saint_ids

router = APIRouter(prefix="/api/v1/saints", tags=["saints"])


# ─── Schemas ──────────────────────────────────────────────────────────────────

class SaintChatRequest(BaseModel):
    message: str

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
        response = await saint_agent_service.chat(
            session,
            user_id,
            saint_id,
            request.message
        )
        return response
    except Exception as e:
        import traceback
        import datetime
        with open("backend_error.log", "a") as f:
            f.write(f"[{datetime.datetime.utcnow()}] Error in chat_with_saint ({saint_id}): {e}\n{traceback.format_exc()}\n")
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

