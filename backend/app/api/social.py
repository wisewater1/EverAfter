from fastapi import APIRouter, Depends, HTTPException, status
from typing import List, Dict, Any
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, desc
from app.db.session import get_async_session
from app.services.interaction_service import interaction_service
from app.models.interaction import AgentInteraction
from app.auth.dependencies import get_current_user
from app.models.engram import Engram

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

@router.post("/interact/random")
async def trigger_random_agent_interaction(
    session: AsyncSession = Depends(get_async_session),
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """
    Manually trigger an autonomous interaction between two random engrams in the society.
    """
    import random
    try:
        # Get at least two random capable engrams
        query = select(Engram)
        result = await session.execute(query)
        active_engrams = result.scalars().all()
        
        # Fallback to any engram if not enough active ones
        if len(active_engrams) < 2:
             raise HTTPException(status_code=400, detail="Not enough agents in society to interact.")
             
        # Pick two random unique ones
        participants = random.sample(active_engrams, 2)
        
        interaction = await interaction_service.simulate_interaction(
            session, str(participants[0].id), str(participants[1].id)
        )
        return interaction
    except Exception as e:
        raise HTTPException(
            status_code=500, 
            detail=f"Failed to simulate random interaction: {str(e)}"
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
    
    # Collect all unique engram IDs
    engram_ids = set()
    for i in interactions:
        engram_ids.add(i.initiator_id)
        engram_ids.add(i.receiver_id)
        
    # Fetch engrams
    engram_map = {}
    if engram_ids:
        engram_query = select(Engram).where(Engram.id.in_(list(engram_ids)))
        engram_res = await session.execute(engram_query)
        engrams_list = engram_res.scalars().all()
        for e in engrams_list:
            engram_map[e.id] = {
                "name": e.name,
                "avatar_url": e.avatar_url,
                "description": e.description,
                "personality_traits": e.personality_traits,
                "dimension_scores": e.dimension_scores
            }
            
    # Format for feed
    return [
        {
            "id": str(i.id),
            "summary": i.summary,
            "initiator_id": str(i.initiator_id),
            "initiator": engram_map.get(i.initiator_id, {"name": "Unknown"}),
            "receiver_id": str(i.receiver_id),
            "receiver": engram_map.get(i.receiver_id, {"name": "Unknown"}),
            "created_at": i.created_at.isoformat(),
            "rapport": i.emotional_rapport
        }
        for i in interactions
    ]
