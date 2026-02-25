from fastapi import APIRouter, Depends, Body
from typing import Dict, Any, Optional
from pydantic import BaseModel
import os
import json
from app.auth.dependencies import get_current_user

router = APIRouter(prefix="/api/v1/sacred", tags=["sacred"])

DATA_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), "data")
STATE_FILE = os.path.join(DATA_DIR, "sacred_state.json")

class SacredStateUpdate(BaseModel):
    is_candle_lit: Optional[bool] = None
    atmosphere: Optional[str] = None
    active_shroud: Optional[str] = None
    active_guardian_id: Optional[str] = None
    biometric_mode: Optional[bool] = None
    iot_scene_active: Optional[str] = None
    glow_intensity: Optional[float] = None
    transition_speed: Optional[float] = None
    metadata: Optional[Dict[str, Any]] = None

def load_state() -> Dict[str, Any]:
    if os.path.exists(STATE_FILE):
        try:
            with open(STATE_FILE, 'r', encoding='utf-8') as f:
                return json.load(f)
        except:
            return {}
    return {}

def save_state(state: Dict[str, Any]):
    if not os.path.exists(DATA_DIR):
        os.makedirs(DATA_DIR)
    with open(STATE_FILE, 'w', encoding='utf-8') as f:
        json.dump(state, f, indent=2)

@router.get("/state")
async def get_sacred_state(current_user: dict = Depends(get_current_user)):
    """Retrieve the current persistent sacred state for the user."""
    state = load_state()
    user_id = current_user.get("id") or current_user.get("sub", "anonymous")
    user_state = state.get(user_id, {
        "is_candle_lit": False,
        "atmosphere": "tranquil",
        "active_shroud": "none",
        "active_guardian_id": None,
        "biometric_mode": False,
        "iot_scene_active": "none",
        "glow_intensity": 0.5,
        "transition_speed": 10.0,
        "metadata": {}
    })
    return user_state

@router.post("/state")
async def update_sacred_state(
    update: SacredStateUpdate,
    current_user: dict = Depends(get_current_user)
):
    """Update the persistent sacred state."""
    state = load_state()
    user_id = current_user.get("id") or current_user.get("sub", "anonymous")
    
    if user_id not in state:
        state[user_id] = {
            "is_candle_lit": False,
            "atmosphere": "tranquil",
            "active_shroud": "none",
            "active_guardian_id": None,
            "biometric_mode": False,
            "iot_scene_active": "none",
            "glow_intensity": 0.5,
            "transition_speed": 10.0,
            "metadata": {}
        }
        
    if update.is_candle_lit is not None:
        state[user_id]["is_candle_lit"] = update.is_candle_lit
    if update.atmosphere is not None:
        state[user_id]["atmosphere"] = update.atmosphere
    if update.active_shroud is not None:
        state[user_id]["active_shroud"] = update.active_shroud
    if update.active_guardian_id is not None:
        state[user_id]["active_guardian_id"] = update.active_guardian_id
    if update.biometric_mode is not None:
        state[user_id]["biometric_mode"] = update.biometric_mode
    if update.iot_scene_active is not None:
        state[user_id]["iot_scene_active"] = update.iot_scene_active
    if update.glow_intensity is not None:
        state[user_id]["glow_intensity"] = update.glow_intensity
    if update.transition_speed is not None:
        state[user_id]["transition_speed"] = update.transition_speed
    if update.metadata is not None:
        state[user_id]["metadata"].update(update.metadata)
        
    save_state(state)
    return state[user_id]

@router.get("/shroud")
async def get_sacred_shroud(current_user: dict = Depends(get_current_user)):
    """Convenience endpoint specifically for the active shroud style."""
    state = load_state()
    user_id = current_user.get("id") or current_user.get("sub", "anonymous")
    user_state = state.get(user_id, {"active_shroud": "none"})
    return {"active_shroud": user_state.get("active_shroud", "none")}
