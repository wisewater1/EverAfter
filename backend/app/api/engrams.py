from fastapi import APIRouter, Depends, HTTPException, status, Body
import asyncio
import uuid
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from typing import List, Dict, Any
from uuid import UUID

from app.db.session import get_async_session
from app.auth.dependencies import get_current_user
from app.schemas.engram import (
    EngramCreate, EngramResponse, EngramUpdate,
    ResponseCreate, ResponseResponse, PersonalityAnalysisResponse,
    EngramAssetBase, EngramAssetResponse
)
from app.models.engram import Engram, EngramDailyResponse, EngramAsset
from app.engrams.personality import get_personality_analyzer
from app.services.health.service import health_service
from app.services.embeddings import get_embeddings_service
from app.services.personality_synthesizer import generate_value_driven_personality
from app.services.mentorship_service import get_mentorship_service
from app.services.saint_runtime import saint_runtime

router = APIRouter(prefix="/api/v1/engrams", tags=["engrams"])


@router.get("/", response_model=List[EngramResponse])
async def list_engrams(
    session: AsyncSession = Depends(get_async_session),
    current_user: dict = Depends(get_current_user)
):
    sub = current_user.get("sub")
    if not sub:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User ID (sub) not found in token"
        )
    
    try:
        user_id = UUID(sub)
        # Get user's own engrams OR archetypal engrams (like St. Raphael)
        query = select(Engram).where(
            (Engram.user_id == user_id) | (Engram.name == 'St. Raphael')
        ).order_by(Engram.created_at.desc())
    except ValueError:
        # Local development fallback when sub is "demo-user-001"
        query = select(Engram).order_by(Engram.created_at.desc())

    result = await session.execute(query)
    engrams = result.scalars().all()

    # The EngramResponse schema requires 'relationship' and 'engram_type',
    # but the SQLAlchemy model (ArchetypalAI) doesn't have them. 
    # Must populate them manually to avoid Pydantic Field required errors.
    response_list = []
    for engram in engrams:
        # We use a dict and provide the required defaults manually if they don't exist
        engram_dict = {
            "id": engram.id,
            "user_id": engram.user_id,
            "name": engram.name,
            "description": engram.description,
            "avatar_url": engram.avatar_url,
            "personality_summary": engram.personality_traits or {},
            "total_questions_answered": engram.total_memories or 0,
            "is_ai_active": True if engram.training_status == 'trained' else False,
            "created_at": engram.created_at,
            "updated_at": engram.updated_at,
            "relationship": "family",  # Default required field
            "engram_type": "family_member" # Default required field
        }
        response_list.append(engram_dict)

    return response_list


@router.post("/create", response_model=EngramResponse, status_code=status.HTTP_201_CREATED)
async def create_engram(
    engram_data: EngramCreate,
    session: AsyncSession = Depends(get_async_session),
    current_user: dict = Depends(get_current_user)
):
    # Generate deep JSON personality matrix based on user's basic description
    personality_matrix = await generate_value_driven_personality(
        name=engram_data.name,
        description=engram_data.description,
        relationship=engram_data.relationship
    )

    new_engram = Engram(
        user_id=engram_data.user_id,
        engram_type=engram_data.engram_type,
        name=engram_data.name,
        email=engram_data.email,
        relationship=engram_data.relationship,
        avatar_url=engram_data.avatar_url,
        description=engram_data.description or "",
        personality_traits=personality_matrix  # <--- INJECT LLM PERSONALITY
    )

    session.add(new_engram)
    await session.commit()
    await session.refresh(new_engram)

    return new_engram


@router.get("/{engram_id}", response_model=EngramResponse)
async def get_engram(
    engram_id: UUID,
    session: AsyncSession = Depends(get_async_session),
    current_user: dict = Depends(get_current_user)
):
    query = select(Engram).where(Engram.id == engram_id)
    result = await session.execute(query)
    engram = result.scalar_one_or_none()

    if not engram:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Engram not found"
        )

    return engram


@router.get("/user/{user_id}", response_model=List[EngramResponse])
async def list_user_engrams(
    user_id: UUID,
    session: AsyncSession = Depends(get_async_session),
    current_user: dict = Depends(get_current_user)
):
    query = select(Engram).where(Engram.user_id == user_id).order_by(Engram.created_at.desc())
    result = await session.execute(query)
    engrams = result.scalars().all()

    return engrams


@router.put("/{engram_id}", response_model=EngramResponse)
async def update_engram(
    engram_id: UUID,
    engram_update: EngramUpdate,
    session: AsyncSession = Depends(get_async_session),
    current_user: dict = Depends(get_current_user)
):
    query = select(Engram).where(Engram.id == engram_id)
    result = await session.execute(query)
    engram = result.scalar_one_or_none()

    if not engram:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Engram not found"
        )

    if engram_update.name is not None:
        engram.name = engram_update.name
    if engram_update.description is not None:
        engram.description = engram_update.description
    if engram_update.avatar_url is not None:
        engram.avatar_url = engram_update.avatar_url
    if engram_update.is_ai_active is not None:
        engram.is_ai_active = engram_update.is_ai_active

    await session.commit()
    await session.refresh(engram)

    return engram


@router.delete("/{engram_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_engram(
    engram_id: UUID,
    session: AsyncSession = Depends(get_async_session),
    current_user: dict = Depends(get_current_user)
):
    query = select(Engram).where(Engram.id == engram_id)
    result = await session.execute(query)
    engram = result.scalar_one_or_none()

    if not engram:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Engram not found"
        )

    await session.delete(engram)
    await session.commit()


@router.post("/{engram_id}/responses", response_model=ResponseResponse, status_code=status.HTTP_201_CREATED)
async def create_response(
    engram_id: UUID,
    response_data: ResponseCreate,
    session: AsyncSession = Depends(get_async_session),
    current_user: dict = Depends(get_current_user)
):
    query = select(Engram).where(Engram.id == engram_id)
    result = await session.execute(query)
    engram = result.scalar_one_or_none()

    if not engram:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Engram not found"
        )

    new_response = EngramDailyResponse(
        engram_id=response_data.engram_id,
        user_id=str(current_user.get("sub")),
        question_text=response_data.question_text,
        response_text=response_data.response_text,
        question_category=response_data.question_category,
        day_number=response_data.day_number,
        mood=response_data.mood
    )

    session.add(new_response)
    await session.commit()
    await session.refresh(new_response)

    # Generate embedding for the new response
    embeddings_service = get_embeddings_service()
    try:
        await embeddings_service.generate_response_embedding(session, str(new_response.id))
    except Exception as e:
        # Don't fail the request if embedding fails, but log it
        import logging
        logging.getLogger(__name__).error(f"Failed to generate embedding: {e}")

    return new_response


@router.post("/{engram_id}/bulk-ingest", response_model=Dict[str, Any])
async def bulk_ingest_vignette(
    engram_id: UUID,
    payload: Dict[str, str] = Body(...),
    session: AsyncSession = Depends(get_async_session),
    current_user: dict = Depends(get_current_user)
):
    vignette = payload.get("vignette", "")
    if not vignette:
        raise HTTPException(status_code=400, detail="No vignette provided")

    # Simple logic: Split by paragraphs or sentences
    paragraphs = [p.strip() for p in vignette.split("\n\n") if p.strip()]
    
    responses_count = 0
    for i, para in enumerate(paragraphs):
        new_response = EngramDailyResponse(
            engram_id=engram_id,
            user_id=str(current_user.get("sub")),
            question_text=f"Legacy Vignette Segment {i+1}",
            response_text=para,
            question_category="vignette",
            day_number=999, # Sentinel for non-daily memories
            mood="reflective"
        )
        session.add(new_response)
        responses_count += 1

    await session.commit()
    return {"status": "success", "segments_ingested": responses_count}


@router.post("/{engram_id}/analyze", response_model=PersonalityAnalysisResponse)
async def analyze_personality(
    engram_id: UUID,
    session: AsyncSession = Depends(get_async_session),
    current_user: dict = Depends(get_current_user)
):
    analyzer = get_personality_analyzer()

    analysis = await analyzer.analyze_engram_personality(session, str(engram_id))

    if analysis["traits"]:
        await analyzer.update_personality_filters(session, str(engram_id), analysis["traits"])

    ai_readiness = await analyzer.calculate_ai_readiness(session, str(engram_id))

    return PersonalityAnalysisResponse(
        total_responses=analysis["total_responses"],
        categories_covered=analysis["categories_covered"],
        personality_summary=analysis["personality_summary"],
        traits=analysis["traits"],
        ai_readiness_score=ai_readiness
    )


@router.post("/{engram_id}/activate-ai", response_model=EngramResponse)
async def activate_ai(
    engram_id: UUID,
    session: AsyncSession = Depends(get_async_session),
    current_user: dict = Depends(get_current_user)
):
    query = select(Engram).where(Engram.id == engram_id)
    result = await session.execute(query)
    engram = result.scalar_one_or_none()

    if not engram:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Engram not found"
        )

    if engram.ai_readiness_score < 80:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"AI readiness score must be at least 80. Current score: {engram.ai_readiness_score}"
        )

    engram.is_ai_active = True
    await session.commit()
    await session.refresh(engram)

    return engram
@router.post("/{engram_id}/mentorship/start", response_model=EngramResponse)
async def start_mentorship(
    engram_id: UUID,
    mentor_id: str = "raphael",
    session: AsyncSession = Depends(get_async_session),
    current_user: dict = Depends(get_current_user)
):
    service = get_mentorship_service(saint_runtime)
    
    # Run mentorship session in the background
    asyncio.create_task(service.start_mentorship_session(session, mentor_id, str(engram_id)))
    
    # Return immediately while training runs in background
    query = select(Engram).where(Engram.id == engram_id)
    result = await session.execute(query)
    return result.scalar_one()


@router.post("/batch-sync", response_model=Dict[str, str])
async def batch_sync_engrams(
    members: List[Dict[str, Any]] = Body(...),
    session: AsyncSession = Depends(get_async_session),
    current_user: dict = Depends(get_current_user)
):
    """
    Syncs multiple family members to the engram backend.
    Returns a mapping of local member IDs to backend engram IDs.
    """
    user_id_str = current_user.get("sub")
    if not user_id_str:
        raise HTTPException(status_code=401, detail="User ID not found")
    
    try:
        user_uuid = UUID(user_id_str)
    except ValueError:
        # Fallback for demo-user-001
        user_uuid = uuid.uuid4() 

    id_mapping = {}
    
    # Get existing engrams for this user to avoid duplicates
    existing_query = select(Engram).where(Engram.user_id == user_uuid)
    existing_res = await session.execute(existing_query)
    existing_engrams = {e.name: e for e in existing_res.scalars().all()}

    for member in members:
        local_id = member.get("id")
        first_name = member.get("firstName", "")
        last_name = member.get("lastName", "")
        full_name = f"{first_name} {last_name}".strip()
        
        if not full_name:
            continue

        if full_name in existing_engrams:
            # Already exists, just map it
            id_mapping[local_id] = str(existing_engrams[full_name].id)
            continue

        # Use a lightweight default personality to avoid sequential LLM timeouts
        # LLM generation can be triggered later during first training
        personality_matrix = {
            "Core Values": {"Family": "Deeply committed to the St. Joseph lineage."},
            "Communication Style": {"Standard": "Waiting for personality synthesis..."},
            "Status": "Initializing"
        }

        new_engram = Engram(
            user_id=user_uuid,
            name=full_name,
            description=member.get("bio") or f"A member of the family tree: {full_name}",
            avatar_url=member.get("photo"),
            personality_traits=personality_matrix,
            training_status='trained' if member.get("aiPersonality", {}).get("isActive") else 'untrained'
        )
        
        session.add(new_engram)
        await session.flush() # Get the ID
        id_mapping[local_id] = str(new_engram.id)

    await session.commit()
    return id_mapping
