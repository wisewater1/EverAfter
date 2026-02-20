from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_, func
from typing import List, Optional
from pydantic import BaseModel
from datetime import datetime
import uuid

from app.db.session import get_async_session
from app.auth.dependencies import get_current_user
from app.models.time_capsule import TimeCapsule
from app.services.saint_agent_service import saint_agent_service

router = APIRouter(prefix="/api/v1/time-capsules", tags=["time-capsules"])

class TimeCapsuleCreate(BaseModel):
    recipient_email: Optional[str] = None
    title: str
    content: str
    media_url: Optional[str] = None
    unlock_date: Optional[datetime] = None
    unlock_condition: Optional[str] = None
    sender_saint_id: str = "user" # or specific saint

class TimeCapsuleResponse(BaseModel):
    id: uuid.UUID
    title: str
    sender_saint_id: str
    is_unlocked: bool
    unlock_date: Optional[datetime]
    created_at: datetime
    # Content hidden until unlocked
    content: Optional[str] = None
    media_url: Optional[str] = None

@router.post("/", response_model=TimeCapsuleResponse)
async def create_capsule(
    capsule_in: TimeCapsuleCreate,
    current_user: dict = Depends(get_current_user),
    session: AsyncSession = Depends(get_async_session)
):
    user_id = uuid.UUID(current_user["id"])
    
    new_capsule = TimeCapsule(
        user_id=user_id,
        sender_saint_id=capsule_in.sender_saint_id,
        recipient_email=capsule_in.recipient_email,
        title=capsule_in.title,
        content=capsule_in.content,
        media_url=capsule_in.media_url,
        unlock_date=capsule_in.unlock_date,
        unlock_condition=capsule_in.unlock_condition,
        is_unlocked=False
    )
    
    session.add(new_capsule)
    await session.commit()
    await session.refresh(new_capsule)
    
    return new_capsule

@router.get("/", response_model=List[TimeCapsuleResponse])
async def list_capsules(
    current_user: dict = Depends(get_current_user),
    session: AsyncSession = Depends(get_async_session)
):
    user_id = uuid.UUID(current_user["id"])
    query = select(TimeCapsule).where(TimeCapsule.user_id == user_id).order_by(TimeCapsule.created_at.desc())
    result = await session.execute(query)
    capsules = result.scalars().all()
    
    # Hide content if locked
    responses = []
    for c in capsules:
        resp = TimeCapsuleResponse(
            id=c.id,
            title=c.title,
            sender_saint_id=c.sender_saint_id,
            is_unlocked=c.is_unlocked,
            unlock_date=c.unlock_date,
            created_at=c.created_at,
            content=c.content if c.is_unlocked else None,
            media_url=c.media_url if c.is_unlocked else None
        )
        responses.append(resp)
        
    return responses

@router.post("/{capsule_id}/unlock", response_model=TimeCapsuleResponse)
async def try_unlock(
    capsule_id: uuid.UUID,
    current_user: dict = Depends(get_current_user),
    session: AsyncSession = Depends(get_async_session)
):
    """Attempt to unlock a capsule based on current time or conditions."""
    user_id = uuid.UUID(current_user["id"])
    query = select(TimeCapsule).where(and_(TimeCapsule.id == capsule_id, TimeCapsule.user_id == user_id))
    result = await session.execute(query)
    capsule = result.scalar_one_or_none()
    
    if not capsule:
        raise HTTPException(status_code=404, detail="Capsule not found")
        
    if capsule.is_unlocked:
        return capsule
        
    # Check unlock date
    now = datetime.utcnow()
    can_unlock = False
    
    if capsule.unlock_date and capsule.unlock_date <= now:
        can_unlock = True
    
    # Check conditions (simple string matching for prototype)
    # In real impl, we'd check event logs
    
    if can_unlock:
        capsule.is_unlocked = True
        capsule.unlocked_at = now
        await session.commit()
        await session.refresh(capsule)
        return capsule
    else:
        raise HTTPException(status_code=403, detail="Capsule is still locked")

@router.post("/generate-letter", response_model=TimeCapsuleCreate)
async def generate_letter(
    saint_id: str,
    topic: str,
    target_date: str, # "10 years" or "marriage"
    current_user: dict = Depends(get_current_user),
    session: AsyncSession = Depends(get_async_session)
):
    """
    Generate a letter from the future using the Saint's persona.
    """
    user_id = current_user["id"]
    
    # Fetch Saint context
    knowledge = await saint_agent_service.get_knowledge(session, user_id, saint_id)
    knowledge_str = "\n".join([f"- {k['key']}: {k['value']}" for k in knowledge])
    
    prompt = f"""
    You are {saint_id.title()}. Write a heartfelt "Time Capsule Letter" to the user, to be opened in the future ({target_date}).
    
    Context about the user:
    {knowledge_str}
    
    Topic: {topic}
    
    Write in your persona. Be visionary, encouraging, and specific based on what you know.
    Start with a title like "To My Future Self" or "On the Occasion of..."
    """
    
    content = await saint_agent_service.llm.generate_response([{"role": "user", "content": prompt}])
    
    # Extract title (heuristic)
    lines = content.split('\n')
    title = lines[0].strip().replace('"', '').replace('#', '').strip()
    if len(title) > 50:
        title = f"Letter from {saint_id.title()}"
        
    return TimeCapsuleCreate(
        title=title,
        content=content,
        sender_saint_id=saint_id,
        unlock_condition=target_date # Store as condition string for now
    )
