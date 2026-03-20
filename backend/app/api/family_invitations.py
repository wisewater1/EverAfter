from __future__ import annotations

import uuid
import re
from typing import Any, Dict, Optional

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field, field_validator
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth.dependencies import get_current_user
from app.db.session import get_async_session
from app.services.invitation_service import InvitationService

router = APIRouter(prefix="/api/v1/family-invitations", tags=["family-invitations"])
EMAIL_PATTERN = re.compile(r"^[^@\s]+@[^@\s]+\.[^@\s]+$")


def _current_user_uuid(current_user: dict) -> uuid.UUID:
    for key in ("sub", "id"):
        value = current_user.get(key)
        if not value:
            continue
        try:
            return uuid.UUID(str(value))
        except ValueError:
            continue
    raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="User ID not found in token")


class CreateInvitationRequest(BaseModel):
    engram_id: Optional[str] = None
    invitee_email: str
    invitee_name: str = Field(..., min_length=1)
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


class ExternalResponseSubmitRequest(BaseModel):
    question_text: str = Field(..., min_length=1)
    response_text: str = Field(..., min_length=1)
    day_number: int = Field(..., ge=1)
    dimension_id: Optional[str] = None
    category_id: Optional[str] = None


@router.post("")
async def create_invitation(
    request: CreateInvitationRequest,
    session: AsyncSession = Depends(get_async_session),
    current_user: dict = Depends(get_current_user),
):
    service = InvitationService(session)
    try:
        return await service.create_invitation(
            engram_id=request.engram_id,
            inviter_user_id=str(_current_user_uuid(current_user)),
            invitee_email=request.invitee_email,
            invitee_name=request.invitee_name.strip(),
            relationship=request.relationship,
            invitation_message=request.invitation_message,
            questions_to_answer=request.questions_to_answer,
        )
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc


@router.get("")
async def list_invitations(
    session: AsyncSession = Depends(get_async_session),
    current_user: dict = Depends(get_current_user),
):
    service = InvitationService(session)
    return await service.list_invitations(str(_current_user_uuid(current_user)))


@router.get("/{invitation_id}/stats")
async def get_invitation_stats(
    invitation_id: str,
    session: AsyncSession = Depends(get_async_session),
    current_user: dict = Depends(get_current_user),
):
    service = InvitationService(session)
    try:
        return await service.get_invitation_stats(
            invitation_id,
            inviter_user_id=str(_current_user_uuid(current_user)),
        )
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc)) from exc


@router.post("/respond/{token}/accept")
async def accept_invitation(
    token: str,
    session: AsyncSession = Depends(get_async_session),
):
    service = InvitationService(session)
    try:
        return await service.accept_invitation(token)
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc


@router.get("/respond/{token}/question")
async def get_question_for_invitee(
    token: str,
    session: AsyncSession = Depends(get_async_session),
):
    service = InvitationService(session)
    try:
        return await service.get_question_for_invitee(token)
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc


@router.post("/respond/{token}/responses")
async def submit_external_response(
    token: str,
    request: ExternalResponseSubmitRequest,
    session: AsyncSession = Depends(get_async_session),
):
    service = InvitationService(session)
    try:
        return await service.submit_external_response(
            token=token,
            question_text=request.question_text.strip(),
            response_text=request.response_text.strip(),
            day_number=request.day_number,
            dimension_id=request.dimension_id,
            category_id=request.category_id,
        )
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc
