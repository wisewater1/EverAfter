from fastapi import APIRouter, Depends, HTTPException, status
from typing import List, Dict, Any
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, desc
from app.db.session import get_async_session
from app.services.interaction_service import interaction_service
from app.services.oasis_service import oasis_service
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
             raise HTTPException(status_code=400, detail="Not enough active agents in society to interact. Please activate or train more engrams.")
             
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

@router.get("/clusters", response_model=Dict[str, List[str]])
async def get_social_clusters(
    session: AsyncSession = Depends(get_async_session),
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """
    Returns interest-based clusters of engrams (Analytical, Creative, etc.).
    """
    return await oasis_service.get_social_clusters(session)

@router.post("/propagate/{engram_id}")
async def trigger_legacy_propagation(
    engram_id: str,
    vignette: str,
    session: AsyncSession = Depends(get_async_session),
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """
    Triggers a 'viral' spread of a legacy vignette through the social graph.
    """
    await oasis_service.trigger_vignette_propagation(session, engram_id, vignette)
    return {"status": "propagation_started", "initiator": engram_id}


@router.post("/boost")
async def boost_society_interactions(
    count: int = 5,
    session: AsyncSession = Depends(get_async_session),
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """
    Randomly triggers multiple autonomous interactions to seed a vacant feed.
    """
    import random
    query = select(Engram)
    result = await session.execute(query)
    engrams = result.scalars().all()

    if len(engrams) < 2:
        raise HTTPException(
            status_code=400, 
            detail="Need at least 2 active agents to seed the society simulation. Please activate more engrams."
        )

    interactions_started = 0
    for _ in range(count):
        participants = random.sample(engrams, 2)
        # We trigger the standard interaction service
        await interaction_service.simulate_interaction(
            session, str(participants[0].id), str(participants[1].id)
        )
        interactions_started += 1

    return {"status": "success", "boosted_count": interactions_started}
