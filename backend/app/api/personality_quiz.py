"""
Personality Quiz API — start quiz, submit answers, get profiles.

Router prefix: /api/v1/personality-quiz
"""
from __future__ import annotations

from fastapi import APIRouter, Body
from typing import Dict, Any

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
    if not session_id:
        return {"error": "session_id is required"}
    return _engine().submit_answers(session_id, answers)


@router.get("/profile/{member_id}")
async def get_profile(member_id: str):
    """Get the completed personality profile for a member."""
    profile = _engine().get_profile(member_id)
    if not profile:
        return {"error": "No profile found. Complete the quiz first."}
    return profile
