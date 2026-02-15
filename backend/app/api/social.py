from fastapi import APIRouter, Depends, HTTPException, status
from typing import List, Dict, Any
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, desc
from app.db.session import get_async_session
from app.services.interaction_service import interaction_service
from app.models.interaction import AgentInteraction
from app.auth.dependencies import get_current_user

router = APIRouter(prefix="/api/v1/social", tags=["social"])

@router.post("/interact/{initiator_id}/{receiver_id}")
async def trigger_agent_interaction(
    initiator_id: str,
    receiver_id: str,
    session: AsyncSession = Depends(get_async_session),
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """
    Manually trigger an autonomous interaction between two engrams.
    """
    try:
        interaction = await interaction_service.simulate_interaction(
            session, initiator_id, receiver_id
        )
        if not interaction:
            raise HTTPException(status_code=404, detail="One or more engrams not found.")
        return interaction
    except Exception as e:
        raise HTTPException(
            status_code=500, 
            detail=f"Failed to simulate interaction: {str(e)}"
        )

@router.get("/feed", response_model=List[Dict[str, Any]])
async def get_society_feed(
    limit: int = 20,
    session: AsyncSession = Depends(get_async_session),
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """
    Returns a feed of all autonomous interactions in the society.
    """
    query = select(AgentInteraction).order_by(desc(AgentInteraction.created_at)).limit(limit)
    result = await session.execute(query)
    interactions = result.scalars().all()
    
    # Format for feed
    return [
        {
            "id": str(i.id),
            "summary": i.summary,
            "initiator_id": str(i.initiator_id),
            "receiver_id": str(i.receiver_id),
            "created_at": i.created_at.isoformat(),
            "rapport": i.emotional_rapport
        }
        for i in interactions
    ]
