"""
Saints API Router

Endpoints for interacting with Saint Agents:
- Bootstrap engrams for saints
- Chat with saints (with knowledge persistence)
- Retrieve saint knowledge
- Get all saint statuses
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


@router.post("/{saint_id}/bootstrap")
async def bootstrap_saint(
    saint_id: str,
    session: AsyncSession = Depends(get_async_session),
    current_user: dict = Depends(get_current_user)
):
    """
    Initialize (or retrieve) the engram for a specific saint.
    """
    if saint_id not in get_all_saint_ids():
        raise HTTPException(status_code=404, detail="Saint not found")

    user_id = str(current_user.get("sub"))
    return await saint_agent_service.bootstrap_saint_engram(session, user_id, saint_id)


@router.post("/{saint_id}/chat", response_model=SaintChatResponse)
async def chat_with_saint(
    saint_id: str,
    request: SaintChatRequest,
    session: AsyncSession = Depends(get_async_session),
    current_user: dict = Depends(get_current_user)
):
    """
    Send a message to a saint.
    - Auto-bootstraps if needed
    - Persists knowledge learned from conversation
    """
    if saint_id not in get_all_saint_ids():
        raise HTTPException(status_code=404, detail="Saint not found")

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
    if saint_id not in get_all_saint_ids():
        raise HTTPException(status_code=404, detail="Saint not found")

    user_id = str(current_user.get("sub"))
    return await saint_agent_service.get_knowledge(session, user_id, saint_id, category)
