from __future__ import annotations

from typing import Any, Dict, Optional

from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth.dependencies import get_current_user
from app.db.session import get_async_session
from app.services.joseph_voice_service import joseph_voice_service
from app.services.voice_ai_service import VoiceAIUnavailableError


router = APIRouter(prefix="/api/v1/joseph/voice", tags=["Joseph Voice"])


def _current_user_id(current_user: Dict[str, Any]) -> str:
    user_id = current_user.get("id") or current_user.get("sub")
    if not user_id:
        raise HTTPException(status_code=401, detail="User ID not found in token")
    return str(user_id)


@router.get("/health")
async def get_voice_health(
    current_user: dict = Depends(get_current_user),
):
    _current_user_id(current_user)
    return await joseph_voice_service.get_voice_health()


@router.post("/profiles")
async def create_voice_profile(
    family_member_id: str = Form(...),
    consent_granted: bool = Form(...),
    consent_phrase: str = Form(""),
    engram_id: Optional[str] = Form(None),
    voice_style_notes: Optional[str] = Form(None),
    current_user: dict = Depends(get_current_user),
    session: AsyncSession = Depends(get_async_session),
):
    try:
        return await joseph_voice_service.create_or_update_profile(
            session,
            owner_user_id=_current_user_id(current_user),
            family_member_id=family_member_id,
            consent_granted=consent_granted,
            consent_phrase=consent_phrase,
            engram_id=engram_id,
            voice_style_notes=voice_style_notes,
        )
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc


@router.get("/profiles/{family_member_id}")
async def get_voice_profile(
    family_member_id: str,
    current_user: dict = Depends(get_current_user),
    session: AsyncSession = Depends(get_async_session),
):
    try:
        return await joseph_voice_service.get_profile_bundle(
            session,
            owner_user_id=_current_user_id(current_user),
            family_member_id=family_member_id,
        )
    except ValueError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc


@router.post("/samples")
async def upload_voice_sample(
    family_member_id: str = Form(...),
    clip_type: str = Form(...),
    prompt_text: str = Form(""),
    duration_seconds: float = Form(0.0),
    approved: bool = Form(False),
    consent_granted: bool = Form(False),
    consent_phrase: str = Form(""),
    engram_id: Optional[str] = Form(None),
    transcribe: bool = Form(False),
    audio_file: UploadFile = File(...),
    current_user: dict = Depends(get_current_user),
    session: AsyncSession = Depends(get_async_session),
):
    try:
        audio_bytes = await audio_file.read()
        return await joseph_voice_service.create_sample(
            session,
            owner_user_id=_current_user_id(current_user),
            family_member_id=family_member_id,
            clip_type=clip_type,
            filename=audio_file.filename or "voice.webm",
            audio_bytes=audio_bytes,
            content_type=audio_file.content_type or "audio/webm",
            prompt_text=prompt_text,
            duration_seconds=duration_seconds,
            approved=approved,
            consent_granted=consent_granted,
            consent_phrase=consent_phrase,
            engram_id=engram_id,
            transcribe=transcribe,
        )
    except VoiceAIUnavailableError as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from exc
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc


@router.post("/quiz-answer")
async def submit_voice_quiz_answer(
    family_member_id: str = Form(...),
    question_id: str = Form(...),
    question_text: str = Form(...),
    duration_seconds: float = Form(0.0),
    audio_file: UploadFile = File(...),
    current_user: dict = Depends(get_current_user),
    session: AsyncSession = Depends(get_async_session),
):
    try:
        audio_bytes = await audio_file.read()
        return await joseph_voice_service.submit_voice_quiz_answer(
            session,
            owner_user_id=_current_user_id(current_user),
            family_member_id=family_member_id,
            question_id=question_id,
            question_text=question_text,
            filename=audio_file.filename or "voice-answer.webm",
            audio_bytes=audio_bytes,
            content_type=audio_file.content_type or "audio/webm",
            duration_seconds=duration_seconds,
        )
    except VoiceAIUnavailableError as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from exc
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc


@router.post("/quiz-answer/{sample_id}/approve")
async def approve_voice_quiz_answer(
    sample_id: str,
    transcript: str = Form(...),
    selected_answer: int = Form(...),
    current_user: dict = Depends(get_current_user),
    session: AsyncSession = Depends(get_async_session),
):
    try:
        return await joseph_voice_service.approve_voice_quiz_answer(
            session,
            owner_user_id=_current_user_id(current_user),
            sample_id=sample_id,
            selected_answer=selected_answer,
            transcript=transcript,
        )
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc


@router.post("/train")
async def train_voice_profile(
    family_member_id: str = Form(...),
    engram_id: Optional[str] = Form(None),
    voice_style_notes: Optional[str] = Form(None),
    current_user: dict = Depends(get_current_user),
    session: AsyncSession = Depends(get_async_session),
):
    try:
        return await joseph_voice_service.start_training(
            session,
            owner_user_id=_current_user_id(current_user),
            family_member_id=family_member_id,
            engram_id=engram_id,
            voice_style_notes=voice_style_notes,
        )
    except VoiceAIUnavailableError as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from exc
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc


@router.get("/train/{family_member_id}")
async def get_train_status(
    family_member_id: str,
    current_user: dict = Depends(get_current_user),
    session: AsyncSession = Depends(get_async_session),
):
    try:
        return await joseph_voice_service.get_training_status(
            session,
            owner_user_id=_current_user_id(current_user),
            family_member_id=family_member_id,
        )
    except ValueError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc


@router.post("/synthesize")
async def synthesize_with_personal_voice(
    family_member_id: str = Form(...),
    engram_id: str = Form(...),
    text_content: str = Form(...),
    current_user: dict = Depends(get_current_user),
    session: AsyncSession = Depends(get_async_session),
):
    try:
        return await joseph_voice_service.synthesize(
            session,
            owner_user_id=_current_user_id(current_user),
            family_member_id=family_member_id,
            engram_id=engram_id,
            text_content=text_content,
        )
    except VoiceAIUnavailableError as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from exc
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
