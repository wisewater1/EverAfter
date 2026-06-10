import re
from typing import Any, Dict, List, Optional

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field, field_validator
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth.dependencies import get_current_user
from app.db.session import get_async_session
from app.services.invitation_service import InvitationService


router = APIRouter(prefix="/api/v1/invitations", tags=["invitations"])
EMAIL_PATTERN = re.compile(r"^[^@\s]+@[^@\s]+\.[^@\s]+$")


class InvitationCreateRequest(BaseModel):
    engram_id: Optional[str] = None
    invitee_email: str
    invitee_name: str
    relationship: Optional[str] = None
    invitation_message: Optional[str] = None
    questions_to_answer: int = Field(default=365, ge=1, le=365)

    @field_validator("invitee_email")
    @classmethod
    def validate_email(cls, value: str) -> str:
        normalized = value.strip().lower()
        if not EMAIL_PATTERN.match(normalized):
            raise ValueError("Invalid email address")
        return normalized

    @field_validator("invitee_name")
    @classmethod
    def validate_name(cls, value: str) -> str:
        normalized = value.strip()
        if not normalized:
            raise ValueError("Invitee name is required")
        return normalized


class InvitationAcceptRequest(BaseModel):
    token: str


class ExternalResponseCreateRequest(BaseModel):
    token: str
    question_text: str
    response_text: str
    day_number: int = Field(ge=1)
    dimension_id: Optional[str] = None
    category_id: Optional[str] = None


def _current_user_id(current_user: Dict[str, Any]) -> str:
    user_id = current_user.get("id") or current_user.get("sub")
    if not user_id:
        raise HTTPException(status_code=401, detail="User ID not found in token")
    return str(user_id)


@router.post("")
async def create_invitation(
    request: InvitationCreateRequest,
    current_user: dict = Depends(get_current_user),
    session: AsyncSession = Depends(get_async_session),
):
    service = InvitationService(session)
    try:
        return await service.create_invitation(
            engram_id=request.engram_id,
            inviter_user_id=_current_user_id(current_user),
            invitee_email=request.invitee_email,
            invitee_name=request.invitee_name,
            relationship=request.relationship,
            invitation_message=request.invitation_message,
            questions_to_answer=request.questions_to_answer,
        )
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc


@router.get("")
async def list_invitations(
    current_user: dict = Depends(get_current_user),
    session: AsyncSession = Depends(get_async_session),
):
    service = InvitationService(session)
    try:
        return await service.list_invitations(_current_user_id(current_user))
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc


@router.get("/{invitation_id}/stats")
async def get_invitation_stats(
    invitation_id: str,
    current_user: dict = Depends(get_current_user),
    session: AsyncSession = Depends(get_async_session),
):
    service = InvitationService(session)
    try:
        return await service.get_invitation_stats(
            invitation_id=invitation_id,
            inviter_user_id=_current_user_id(current_user),
        )
    except ValueError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc


@router.post("/respond/{token}/accept")
async def accept_invitation(
    token: str,
    session: AsyncSession = Depends(get_async_session),
):
    service = InvitationService(session)
    try:
        return await service.accept_invitation(token)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc


@router.get("/respond/{token}/question")
async def get_question_for_invitee(
    token: str,
    session: AsyncSession = Depends(get_async_session),
):
    service = InvitationService(session)
    try:
        return await service.get_question_for_invitee(token)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc


@router.post("/respond/{token}/responses")
async def submit_external_response(
    token: str,
    request: ExternalResponseCreateRequest,
    session: AsyncSession = Depends(get_async_session),
):
    if request.token != token:
        raise HTTPException(status_code=400, detail="Token mismatch")

    service = InvitationService(session)
    try:
        return await service.submit_external_response(
            token=token,
            question_text=request.question_text,
            response_text=request.response_text,
            day_number=request.day_number,
            dimension_id=request.dimension_id,
            category_id=request.category_id,
        )
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
