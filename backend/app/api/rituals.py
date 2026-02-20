from fastapi import APIRouter, Depends, HTTPException, Body
from typing import List, Dict, Any
from pydantic import BaseModel
import asyncio

from app.services.ritual_engine import ritual_engine
from app.services.saint_event_bus import saint_event_bus
from app.auth.dependencies import get_current_user

router = APIRouter(prefix="/api/v1/rituals", tags=["rituals"])

class RitualRequest(BaseModel):
    ritual_type: str
    context: str
    participants: List[str]

@router.post("/generate")
async def generate_ritual_script(
    request: RitualRequest,
    current_user: dict = Depends(get_current_user)
):
    """Generates a multi-saint ritual script."""
    script = await ritual_engine.generate_ritual(
        ritual_type=request.ritual_type,
        user_context=request.context,
        participants=request.participants
    )
    return script

@router.post("/complete")
async def complete_ritual(
    ritual_data: Dict[str, Any] = Body(...),
    current_user: dict = Depends(get_current_user)
):
    """Logs the completion of a ritual."""
    # Emit event for history/points/achievements
    # We could define RitualCompletedEvent, but for now just use generic log or implement later.
    # We'll just print for now.
    print(f"Ritual Completed: {ritual_data.get('title')}")
    return {"status": "completed"}
