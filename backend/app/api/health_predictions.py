"""
Health Predictions API — unified endpoints for St. Raphael and St. Joseph.

Router prefix: /api/v1/health-predictions
"""
from __future__ import annotations

from fastapi import APIRouter, Body, Depends, HTTPException, Query
from typing import Dict, Any, List, Optional

router = APIRouter(prefix="/api/v1/health-predictions", tags=["Health Predictions"])


# ── Auth helper ──────────────────────────────────────────────────

def _get_user_id(current_user: dict) -> str:
    return current_user.get("id") or current_user.get("sub", "anonymous")


def _get_current_user():
    """Lazy import to avoid circular deps at module load."""
    from app.auth.dependencies import get_current_user
    return get_current_user


# ── Lazy predictor ───────────────────────────────────────────────

def _predictor():
    from app.services.shared_health_predictor import shared_predictor
    return shared_predictor


# ═════════════════════════════════════════════════════════════════
#  Endpoints
# ═════════════════════════════════════════════════════════════════


@router.post("/predict")
async def predict_user(
    payload: Dict[str, Any] = Body(...),
    current_user: dict = Depends(_get_current_user()),
):
    """Individual user health-trend prediction."""
    user_id = _get_user_id(current_user)
    result = await _predictor().predict_user(
        user_id=user_id,
        metrics_history=payload.get("metrics_history", []),
        profile=payload.get("profile"),
    )
    return result


@router.post("/predict-family")
async def predict_family(
    payload: Dict[str, Any] = Body(...),
    current_user: dict = Depends(_get_current_user()),
):
    """Family-wide risk analysis (consent-gated)."""
    user_id = _get_user_id(current_user)
    result = await _predictor().predict_family(
        user_id=user_id,
        family_members=payload.get("members", []),
        consent_map=payload.get("consent_map", {}),
    )
    return result


@router.post("/simulate")
async def simulate_scenario(
    payload: Dict[str, Any] = Body(...),
    current_user: dict = Depends(_get_current_user()),
):
    """'What-if' scenario using Medical Twin projection."""
    user_id = _get_user_id(current_user)
    result = await _predictor().simulate_scenario(
        user_id=user_id,
        scenarios=payload.get("scenarios", []),
        baseline_metrics=payload.get("baseline_metrics", []),
    )
    return result


@router.get("/early-warnings")
async def get_early_warnings(
    current_user: dict = Depends(_get_current_user()),
):
    """Active early warnings for the current user."""
    user_id = _get_user_id(current_user)
    # Use empty recent data for now — real implementation would
    # pull from the user's actual data store
    warnings = await _predictor().detect_early_warnings(user_id, [])
    return {"warnings": warnings}


@router.post("/consent")
async def update_consent(
    payload: Dict[str, Any] = Body(...),
    current_user: dict = Depends(_get_current_user()),
):
    """Update family member consent for health predictions."""
    user_id = _get_user_id(current_user)
    consents = payload.get("consents", [])
    # In a full implementation this would persist to DB
    # For now, we acknowledge and return the updated map
    consent_map = {c["member_id"]: c["consent_granted"] for c in consents if "member_id" in c}
    return {
        "status": "updated",
        "user_id": user_id,
        "consent_map": consent_map,
        "count": len(consent_map),
    }
