from fastapi import APIRouter, Depends, HTTPException, Body
from typing import List, Dict, Any, Optional
from pydantic import BaseModel
import asyncio
import json
import os

from app.services.ritual_engine import ritual_engine
from app.auth.dependencies import get_current_user

router = APIRouter(prefix="/api/v1/rituals", tags=["rituals"])

# Persist ritual history to a local JSON file
DATA_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), "data")
HISTORY_FILE = os.path.join(DATA_DIR, "ritual_history.json")


def _load_history() -> Dict[str, Any]:
    if os.path.exists(HISTORY_FILE):
        try:
            with open(HISTORY_FILE, "r", encoding="utf-8") as f:
                return json.load(f)
        except Exception:
            return {}
    return {}


def _save_history(data: Dict[str, Any]):
    if not os.path.exists(DATA_DIR):
        os.makedirs(DATA_DIR)
    with open(HISTORY_FILE, "w", encoding="utf-8") as f:
        json.dump(data, f, indent=2)


def _get_user_id(current_user: dict) -> str:
    return current_user.get("id") or current_user.get("sub", "anonymous")


class RitualRequest(BaseModel):
    ritual_type: str
    context: str
    participants: List[str]
    ancestor_id: Optional[str] = None


@router.post("/generate")
async def generate_ritual_script(
    request: RitualRequest,
    current_user: dict = Depends(get_current_user)
):
    """Generates a multi-saint ritual script. Returns a pre-written script if LLM unavailable."""
    script = await ritual_engine.generate_ritual(
        ritual_type=request.ritual_type,
        user_context=request.context,
        participants=request.participants,
        ancestor_id=request.ancestor_id
    )
    return script


@router.post("/complete")
async def complete_ritual(
    ritual_data: Dict[str, Any] = Body(...),
    current_user: dict = Depends(get_current_user)
):
    """Logs the completion of a ritual to the persistent history file."""
    from datetime import datetime, timezone
    user_id = _get_user_id(current_user)

    history = _load_history()
    if user_id not in history:
        history[user_id] = []

    history[user_id].append({
        "title": ritual_data.get("title", "Unnamed Ritual"),
        "ritual_type": ritual_data.get("ritual_type", "unknown"),
        "participants": ritual_data.get("participants", []),
        "completed_at": datetime.now(timezone.utc).isoformat(),
        "steps_count": ritual_data.get("steps_count", 0),
    })

    # Keep last 50 rituals per user
    history[user_id] = history[user_id][-50:]
    _save_history(history)

    return {"status": "completed", "total_rituals": len(history[user_id])}


@router.get("/history")
async def get_ritual_history(
    limit: int = 20,
    current_user: dict = Depends(get_current_user)
):
    """Returns the user's completed ritual history."""
    user_id = _get_user_id(current_user)
    history = _load_history()
    user_history = history.get(user_id, [])
    return {
        "history": list(reversed(user_history[-limit:])),
        "total": len(user_history)
    }


@router.get("/types")
async def get_ritual_types():
    """Returns available ritual types and their descriptions."""
    return {
        "types": [
            {
                "id": "morning_prayer",
                "label": "Morning Vigil",
                "icon": "🌅",
                "description": "Align your spirit with the day ahead through guided reflection."
            },
            {
                "id": "reflection",
                "label": "Mirror of Remembrance",
                "icon": "🪞",
                "description": "Honest self-examination in the presence of your guardians."
            },
            {
                "id": "crisis_intercession",
                "label": "Shield of the Guardians",
                "icon": "🛡️",
                "description": "Emergency intercession — the council rallies to your defense."
            },
            {
                "id": "affirmation",
                "label": "Blessing of the Engrams",
                "icon": "✨",
                "description": "Deliver love, affirmation and blessing to a chosen soul."
            },
        ]
    }
