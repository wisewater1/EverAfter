from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from typing import List
from uuid import UUID

from app.db.session import get_async_session
from app.auth.dependencies import get_current_user
from app.services.personality_analyzer import PersonalityAnalyzer
from pydantic import BaseModel

router = APIRouter(prefix="/api/v1/personality", tags=["personality"])


# Personality Analysis Endpoints

@router.post("/analyze/{ai_id}")
async def analyze_personality(
    ai_id: UUID,
    force_reanalysis: bool = False,
    session: AsyncSession = Depends(get_async_session),
    current_user: dict = Depends(get_current_user)
):
    """
    Trigger personality analysis for an archetypal AI
    Extracts multi-dimensional personality traits from daily question responses
    """
    analyzer = PersonalityAnalyzer(session)
    user_id = str(current_user.get("sub"))

    try:
        result = await analyzer.analyze_ai_personality(
            str(ai_id),
            user_id,
            force_reanalysis=force_reanalysis
        )
        return result
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        )


@router.get("/profile/{ai_id}")
async def get_personality_profile(
    ai_id: UUID,
    session: AsyncSession = Depends(get_async_session),
    current_user: dict = Depends(get_current_user)
):
    """
    Get comprehensive personality profile for an archetypal AI
    Returns traits organized by dimensions
    """
    analyzer = PersonalityAnalyzer(session)

    try:
        profile = await analyzer._build_personality_profile(str(ai_id))
        return profile
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        )


@router.get("/dimensions")
async def list_personality_dimensions(
    session: AsyncSession = Depends(get_async_session),
    current_user: dict = Depends(get_current_user)
):
    """
    List all personality dimensions
    Shows the multi-layer categorization system
    """
    from app.models.engram import PersonalityDimension

    query = select(PersonalityDimension).where(
        PersonalityDimension.is_active == True
    ).order_by(
        PersonalityDimension.depth_level.asc(),
        PersonalityDimension.dimension_order.asc()
    )

    result = await session.execute(query)
    dimensions = result.scalars().all()

    # Organize into hierarchy
    hierarchy = {}
    root_dimensions = []

    for dim in dimensions:
        dim_data = {
            "id": str(dim.id),
            "name": dim.dimension_name,
            "display_name": dim.display_name,
            "description": dim.description,
            "depth_level": dim.depth_level,
            "affects_task_types": dim.affects_task_types,
            "children": []
        }

        if dim.parent_dimension_id:
            parent_id = str(dim.parent_dimension_id)
            if parent_id not in hierarchy:
                hierarchy[parent_id] = []
            hierarchy[parent_id].append(dim_data)
        else:
            root_dimensions.append(dim_data)

    # Attach children to parents
    def attach_children(dim_list):
        for dim in dim_list:
            dim_id = dim["id"]
            if dim_id in hierarchy:
                dim["children"] = hierarchy[dim_id]
                attach_children(dim["children"])

    attach_children(root_dimensions)

    return {
        "total_dimensions": len(dimensions),
        "dimensions": root_dimensions
    }


@router.get("/categories")
async def list_question_categories(
    session: AsyncSession = Depends(get_async_session),
    current_user: dict = Depends(get_current_user)
):
    """
    List all question categories
    Shows hierarchical organization of questions
    """
    from app.models.engram import QuestionCategory

    query = select(QuestionCategory).where(
        QuestionCategory.is_active == True
    ).order_by(
        QuestionCategory.depth_level.asc(),
        QuestionCategory.category_order.asc()
    )

    result = await session.execute(query)
    categories = result.scalars().all()

    return [{
        "id": str(cat.id),
        "name": cat.category_name,
        "display_name": cat.display_name,
        "description": cat.description,
        "depth_level": cat.depth_level,
        "question_count": cat.question_count
    } for cat in categories]


@router.post("/traits/{ai_id}/associate-tasks")
async def associate_traits_with_tasks(
    ai_id: UUID,
    session: AsyncSession = Depends(get_async_session),
    current_user: dict = Depends(get_current_user)
):
    """
    Create associations between personality traits and task types
    This enables personality-driven task execution
    """
    analyzer = PersonalityAnalyzer(session)

    try:
        result = await analyzer.associate_traits_with_tasks(str(ai_id))
        return result
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        )
