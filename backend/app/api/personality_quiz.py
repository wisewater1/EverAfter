"""
Personality Quiz API — start quiz, submit answers, get profiles.

Router prefix: /api/v1/personality-quiz
"""
from __future__ import annotations

import secrets
import time
from collections import deque
from datetime import datetime, timezone
from typing import Any, Deque, Dict, Tuple
from uuid import UUID

from fastapi import APIRouter, Body, Depends, HTTPException, Request, status
from sqlalchemy import select, text
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth.dependencies import get_current_user
from app.db.session import get_async_session
from app.models.engram import Engram
from app.models.quiz_invite import QuizInvite

# Lightweight, dependency-free per-IP sliding-window limiter for the public
# (unauthenticated) quiz endpoints. In-process only — adequate as an abuse
# guard on Render's single instance; resets on restart. Not a substitute for a
# real WAF/slowapi if this scales out.
_RATE_BUCKETS: Dict[Tuple[str, str], Deque[float]] = {}


def _client_ip(request: Request) -> str:
    fwd = request.headers.get("x-forwarded-for")
    if fwd:
        return fwd.split(",")[0].strip()
    return request.client.host if request.client else "unknown"


def _enforce_rate_limit(request: Request, scope: str, limit: int, window_s: float) -> None:
    key = (scope, _client_ip(request))
    now = time.monotonic()
    bucket = _RATE_BUCKETS.setdefault(key, deque())
    while bucket and now - bucket[0] > window_s:
        bucket.popleft()
    if len(bucket) >= limit:
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail="Too many requests. Please slow down and try again shortly.",
        )
    bucket.append(now)

router = APIRouter(prefix="/api/v1/personality-quiz", tags=["Personality Quiz"])


def _engine():
    from app.services.personality_quiz import quiz_engine
    return quiz_engine


@router.get("/questions")
async def get_questions():
    """Return all 50 quiz questions."""
    return {"questions": _engine().get_questions(), "total": 50}


@router.post("/start")
async def start_quiz(payload: Dict[str, Any] = Body(...)):
    """Start a new quiz session for a family member."""
    member_id = payload.get("member_id", "")
    member_name = payload.get("member_name", "")
    if not member_id:
        return {"error": "member_id is required"}
    return _engine().start_session(member_id, member_name)


@router.post("/submit")
async def submit_answers(payload: Dict[str, Any] = Body(...)):
    """Submit all answers and get the personality profile."""
    session_id = payload.get("session_id", "")
    answers = payload.get("answers", {})
    member_id = payload.get("member_id", "")
    member_name = payload.get("member_name", "")

    if not session_id and not member_id:
        return {"error": "session_id or member_id is required"}

    return _engine().submit_answers(
        session_id=session_id,
        answers=answers,
        member_id=member_id,
        member_name=member_name,
    )


@router.get("/profile/{member_id}")
async def get_profile(member_id: str):
    """Get the completed personality profile for a member."""
    profile = _engine().get_profile(member_id)
    if not profile:
        return {"error": "No profile found. Complete the quiz first."}
    return profile


# ── Shareable friend-quiz invites ────────────────────────────────────────────
# An owner mints a tokenized link; a friend (no account, any device) answers it
# at /quiz/<token>; the profile is stored back against the invite.

def _public_invite_view(invite: QuizInvite) -> Dict[str, Any]:
    return {
        "token": invite.token,
        "subject_name": invite.subject_name,
        "subject_member_id": invite.subject_member_id,
        "status": invite.status,
        "share_path": f"/quiz/{invite.token}",
        "created_at": invite.created_at.isoformat() if invite.created_at else None,
        "completed_at": invite.completed_at.isoformat() if invite.completed_at else None,
        "profile": invite.profile,
    }


@router.post("/invites")
async def create_invite(
    payload: Dict[str, Any] = Body(default={}),
    session: AsyncSession = Depends(get_async_session),
    current_user: dict = Depends(get_current_user),
):
    """Owner: create a shareable quiz invite, returns the token + share path."""
    sub = current_user.get("sub") or current_user.get("id")
    if not sub:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="User ID not found")
    try:
        owner_uuid = UUID(str(sub))
    except ValueError:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid user id")

    invite = QuizInvite(
        token=secrets.token_urlsafe(24),
        owner_user_id=owner_uuid,
        subject_name=(payload.get("subject_name") or "a loved one")[:120],
        subject_member_id=payload.get("subject_member_id"),
        status="pending",
    )
    session.add(invite)
    await session.commit()
    return _public_invite_view(invite)


@router.get("/invites")
async def list_invites(
    session: AsyncSession = Depends(get_async_session),
    current_user: dict = Depends(get_current_user),
):
    """Owner: list their invites and any completed results."""
    sub = current_user.get("sub") or current_user.get("id")
    if not sub:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="User ID not found")
    try:
        owner_uuid = UUID(str(sub))
    except ValueError:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid user id")

    try:
        rows = (
            await session.execute(
                select(QuizInvite).where(QuizInvite.owner_user_id == owner_uuid).order_by(QuizInvite.created_at.desc())
            )
        ).scalars().all()
    except Exception:
        return {"invites": []}
    return {"invites": [_public_invite_view(r) for r in rows]}


@router.get("/public/{token}")
async def get_public_invite(token: str, request: Request, session: AsyncSession = Depends(get_async_session)):
    """Public (no auth): a friend loads the quiz questions for a token."""
    _enforce_rate_limit(request, "quiz_public_get", limit=60, window_s=60)
    invite = await session.get(QuizInvite, token)
    if not invite:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="This quiz link is invalid or has expired.")
    return {
        "subject_name": invite.subject_name,
        "status": invite.status,
        "questions": _engine().get_questions(),
        "total": 50,
    }


@router.post("/public/{token}/submit")
async def submit_public_invite(
    token: str,
    request: Request,
    payload: Dict[str, Any] = Body(...),
    session: AsyncSession = Depends(get_async_session),
):
    """Public (no auth): a friend submits answers for a tokenized invite."""
    _enforce_rate_limit(request, "quiz_public_submit", limit=10, window_s=60)
    invite = await session.get(QuizInvite, token)
    if not invite:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="This quiz link is invalid or has expired.")

    answers = payload.get("answers", {})
    if not isinstance(answers, dict) or not answers:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="No answers submitted.")

    profile = _engine().submit_answers(
        session_id=f"invite-{token}",
        answers=answers,
        member_id=invite.subject_member_id or token,
        member_name=invite.subject_name,
    )

    invite.answers = answers
    invite.profile = profile
    invite.status = "completed"
    invite.completed_at = datetime.now(timezone.utc)
    await session.commit()

    # Also condition the linked engram (if any) on what this person actually
    # answered, so their engram's chat replies reflect it instead of every
    # family member's engram sounding the same. Non-blocking: the invite's
    # own result above is already saved regardless of what happens here.
    if invite.subject_member_id and isinstance(profile, dict):
        try:
            link_row = (
                await session.execute(
                    text(
                        "SELECT engram_id FROM engram_family_links "
                        "WHERE user_id = :owner_id AND joseph_member_id = :member_id"
                    ),
                    {"owner_id": str(invite.owner_user_id), "member_id": invite.subject_member_id},
                )
            ).first()
            if link_row:
                engram = await session.get(Engram, link_row[0])
                if engram:
                    engram.personality_traits = profile.get("traits") or []
                    engram.core_values = profile.get("strengths") or []
                    engram.communication_style = profile.get("communication_style") or ""
                    await session.commit()
        except Exception:
            pass

    # The friend gets a gracious confirmation + the headline archetype, not the
    # full profile (that belongs to the owner).
    archetype = (profile or {}).get("archetype") if isinstance(profile, dict) else None
    return {"ok": True, "subject_name": invite.subject_name, "archetype": archetype}
