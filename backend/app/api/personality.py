from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from typing import List
from uuid import UUID

from app.db.session import get_async_session
from app.auth.dependencies import get_current_user
from app.services.personality_analyzer import PersonalityAnalyzer
from app.services.invitation_service import InvitationService
from pydantic import BaseModel, EmailStr

router = APIRouter(prefix="/api/v1/personality", tags=["personality"])


# Schemas

class InvitationCreate(BaseModel):
    engram_id: UUID
    invitee_email: EmailStr
    invitee_name: str
    invitation_message: str = None
    questions_to_answer: int = 365


class ExternalResponseSubmit(BaseModel):
    question_text: str
    response_text: str
    day_number: int
    dimension_id: UUID = None
    category_id: UUID = None


# Personality Analysis Endpoints

@router.post("/analyze/{engram_id}")
async def analyze_personality(
    engram_id: UUID,
    force_reanalysis: bool = False,
    session: AsyncSession = Depends(get_async_session),
    current_user: dict = Depends(get_current_user)
):
    """
    Trigger personality analysis for an engram
    Extracts multi-dimensional personality traits from responses
    """
    analyzer = PersonalityAnalyzer(session)

    try:
        result = await analyzer.analyze_engram_personality(
            str(engram_id),
            force_reanalysis=force_reanalysis
        )
        return result
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        )


@router.get("/profile/{engram_id}")
async def get_personality_profile(
    engram_id: UUID,
    session: AsyncSession = Depends(get_async_session),
    current_user: dict = Depends(get_current_user)
):
    """
    Get comprehensive personality profile for an engram
    Returns traits organized by dimensions
    """
    analyzer = PersonalityAnalyzer(session)

    try:
        profile = await analyzer._build_personality_profile(str(engram_id))
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


@router.post("/traits/{engram_id}/associate-tasks")
async def associate_traits_with_tasks(
    engram_id: UUID,
    session: AsyncSession = Depends(get_async_session),
    current_user: dict = Depends(get_current_user)
):
    """
    Create associations between personality traits and task types
    This enables personality-driven task execution
    """
    analyzer = PersonalityAnalyzer(session)

    try:
        result = await analyzer.associate_traits_with_tasks(str(engram_id))
        return result
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        )


# Family Member Invitation Endpoints

@router.post("/invitations/create")
async def create_family_invitation(
    invitation_data: InvitationCreate,
    session: AsyncSession = Depends(get_async_session),
    current_user: dict = Depends(get_current_user)
):
    """
    Create invitation for family member to answer questions about themselves
    KEY: Family members answer their OWN questions, not answered by user
    """
    invitation_service = InvitationService(session)
    user_id = str(current_user.get("sub"))

    try:
        result = await invitation_service.create_invitation(
            engram_id=str(invitation_data.engram_id),
            inviter_user_id=user_id,
            invitee_email=invitation_data.invitee_email,
            invitee_name=invitation_data.invitee_name,
            invitation_message=invitation_data.invitation_message,
            questions_to_answer=invitation_data.questions_to_answer
        )
        return result
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        )


@router.get("/invitations")
async def list_invitations(
    session: AsyncSession = Depends(get_async_session),
    current_user: dict = Depends(get_current_user)
):
    """
    List all invitations created by current user
    """
    invitation_service = InvitationService(session)
    user_id = str(current_user.get("sub"))

    try:
        invitations = await invitation_service.list_invitations(user_id)
        return invitations
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        )


@router.get("/invitations/{invitation_id}/stats")
async def get_invitation_stats(
    invitation_id: UUID,
    session: AsyncSession = Depends(get_async_session),
    current_user: dict = Depends(get_current_user)
):
    """
    Get statistics for a specific invitation
    """
    invitation_service = InvitationService(session)

    try:
        stats = await invitation_service.get_invitation_stats(str(invitation_id))
        return stats
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(e)
        )


# Public endpoints for invited family members (no auth required)

@router.get("/respond/{token}/accept", tags=["public"])
async def accept_invitation_public(
    token: str,
    session: AsyncSession = Depends(get_async_session)
):
    """
    Accept invitation (public endpoint, no auth)
    Family member accepts invitation to answer questions
    """
    invitation_service = InvitationService(session)

    try:
        result = await invitation_service.accept_invitation(token)
        return result
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )


@router.get("/respond/{token}/question", tags=["public"])
async def get_question_for_invitee_public(
    token: str,
    session: AsyncSession = Depends(get_async_session)
):
    """
    Get next question for invited family member (public endpoint)
    """
    invitation_service = InvitationService(session)

    try:
        question = await invitation_service.get_question_for_invitee(token)
        return question
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )


@router.post("/respond/{token}/submit", tags=["public"])
async def submit_external_response_public(
    token: str,
    response_data: ExternalResponseSubmit,
    session: AsyncSession = Depends(get_async_session)
):
    """
    Submit response from invited family member (public endpoint)
    Family member answers about THEMSELVES, not someone else
    """
    invitation_service = InvitationService(session)

    try:
        result = await invitation_service.submit_external_response(
            token=token,
            question_text=response_data.question_text,
            response_text=response_data.response_text,
            day_number=response_data.day_number,
            dimension_id=str(response_data.dimension_id) if response_data.dimension_id else None,
            category_id=str(response_data.category_id) if response_data.category_id else None
        )
        return result
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )
