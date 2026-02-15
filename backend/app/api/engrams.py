from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from typing import List
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
    
    user_id = UUID(sub)
    # Get user's own engrams OR archetypal engrams (like St. Raphael)
    query = select(Engram).where(
        (Engram.user_id == user_id) | (Engram.name == 'St. Raphael')
    ).order_by(Engram.created_at.desc())
    result = await session.execute(query)
    engrams = result.scalars().all()

    return engrams


@router.post("/create", response_model=EngramResponse, status_code=status.HTTP_201_CREATED)
async def create_engram(
    engram_data: EngramCreate,
    session: AsyncSession = Depends(get_async_session),
    current_user: dict = Depends(get_current_user)
):
    new_engram = Engram(
        user_id=engram_data.user_id,
        engram_type=engram_data.engram_type,
        name=engram_data.name,
        email=engram_data.email,
        relationship=engram_data.relationship,
        avatar_url=engram_data.avatar_url,
        description=engram_data.description or ""
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
