"""
DHT API Router
==============
All endpoints for the Delphi Health Trajectory feature.
Prefix: /api/v1/dht
"""
from __future__ import annotations

import asyncio
from datetime import datetime
from typing import Any, Dict, List, Optional

from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, Query
from fastapi.responses import JSONResponse

from app.models.dht import (
    AuditEntry, BehavioralModifiers, ConsentRecord, DelphiHealthTrajectory,
    DHTResponse, ObserveBatchRequest, ObserveRequest, ObserveResponse,
    OceanProfile, OceanScores, UserEventRequest,
)
from app.services.dht_engine import compute_dht, compute_behavioral_modifiers
from app.services import dht_store
from app.api.auth_utils import get_current_user_id   # existing auth helper

router = APIRouter(prefix="/api/v1/dht", tags=["dht"])

# ─────────────────────────────────────────────────────────────────────────────
# Ingest — Observations
# ─────────────────────────────────────────────────────────────────────────────

@router.post("/observe", response_model=ObserveResponse, summary="Ingest a single observation")
async def observe(
    req: ObserveRequest,
    background_tasks: BackgroundTasks,
    caller_id: str = Depends(get_current_user_id),
):
    """
    Ingest one health data point (vital, lab, wearable, etc.).
    Triggers an async DHT recompute in the background (≤60s target).
    """
    from app.models.dht import Observation
    obs = Observation(
        person_id=req.person_id,
        source=req.source,
        category=req.category,
        metric=req.metric,
        value=req.value,
        unit=req.unit,
        tags=req.tags,
        notes=req.notes,
        recorded_at=req.recorded_at or datetime.utcnow(),
    )
    dht_store.save_observation(obs)
    background_tasks.add_task(_recompute_dht, req.person_id)
    _audit(caller_id, req.person_id, "edit", f"observe:{req.metric}")
    return ObserveResponse(obs_id=obs.obs_id, queued=True, estimated_refresh_seconds=60)


@router.post("/observe/batch", response_model=ObserveResponse, summary="Ingest multiple observations")
async def observe_batch(
    req: ObserveBatchRequest,
    background_tasks: BackgroundTasks,
    caller_id: str = Depends(get_current_user_id),
):
    from app.models.dht import Observation
    obs_ids = []
    for o in req.observations:
        obs = Observation(
            person_id=req.person_id,
            source=o.source, category=o.category, metric=o.metric,
            value=o.value, unit=o.unit, tags=o.tags, notes=o.notes,
            recorded_at=o.recorded_at or datetime.utcnow(),
        )
        dht_store.save_observation(obs)
        obs_ids.append(obs.obs_id)
    background_tasks.add_task(_recompute_dht, req.person_id)
    _audit(caller_id, req.person_id, "edit", f"observe:batch:{len(req.observations)}")
    return ObserveResponse(obs_id=obs_ids[0] if obs_ids else "", queued=True, estimated_refresh_seconds=90)


@router.post("/event", response_model=ObserveResponse, summary="Log a user-lifecycle event")
async def user_event(
    req: UserEventRequest,
    background_tasks: BackgroundTasks,
    caller_id: str = Depends(get_current_user_id),
):
    """Log a qualitative event (stress, illness, travel, missed_med, etc.)."""
    from app.models.dht import Observation
    obs = Observation(
        person_id=req.person_id,
        source="user_event",
        category="event",
        metric=req.type,
        value=req.severity,
        unit="",
        tags=["user_event", req.type],
        notes=req.note,
    )
    dht_store.save_observation(obs)
    background_tasks.add_task(_recompute_dht, req.person_id)
    return ObserveResponse(obs_id=obs.obs_id, queued=True, estimated_refresh_seconds=60)


# ─────────────────────────────────────────────────────────────────────────────
# Read — DHT
# ─────────────────────────────────────────────────────────────────────────────

@router.get("/{person_id}", response_model=DHTResponse, summary="Get DHT for a person")
async def get_dht(
    person_id: str,
    horizon: Optional[str] = Query(None, description="Filter: short | mid | long"),
    force_recompute: bool = Query(False),
    caller_id: str = Depends(get_current_user_id),
):
    """
    Retrieve the Delphi Health Trajectory.
    Returns cached version or triggers recompute if stale (>6h) or forced.
    """
    _audit(caller_id, person_id, "view", "dht:full")

    dht = dht_store.get_dht(person_id) if not force_recompute else None

    # Recompute if missing or stale (>6 hours)
    if dht is None or (datetime.utcnow() - dht.computed_at).seconds > 21600:
        dht = await _recompute_dht(person_id)

    if dht is None:
        raise HTTPException(status_code=404, detail="No DHT data found for this person.")

    stale = (datetime.utcnow() - dht.computed_at).seconds > 21600
    obs = dht_store.get_observations(person_id, days=1)
    last_obs_at = max((o.recorded_at for o in obs), default=None) if obs else None

    return DHTResponse(dht=dht, stale=stale, last_observation_at=last_obs_at)


@router.get("/{person_id}/risk-cards", summary="Risk cards only")
async def get_risk_cards(
    person_id: str,
    caller_id: str = Depends(get_current_user_id),
):
    _audit(caller_id, person_id, "view", "dht:risk_cards")
    dht = dht_store.get_dht(person_id)
    if not dht:
        return {"risk_cards": [], "data_quality": "empty"}
    return {"risk_cards": [c.model_dump() for c in dht.risk_cards], "data_quality": dht.data_quality}


@router.get("/{person_id}/leading-indicators", summary="Leading health indicators")
async def get_leading_indicators(
    person_id: str,
    caller_id: str = Depends(get_current_user_id),
):
    _audit(caller_id, person_id, "view", "dht:leading_indicators")
    dht = dht_store.get_dht(person_id)
    if not dht:
        return {"indicators": []}
    return {"indicators": [i.model_dump() for i in dht.leading_indicators]}


@router.get("/{person_id}/next-best-measurement", summary="Measurement with highest info gain")
async def get_next_best(
    person_id: str,
    caller_id: str = Depends(get_current_user_id),
):
    _audit(caller_id, person_id, "view", "dht:next_best")
    dht = dht_store.get_dht(person_id)
    if not dht or not dht.next_best_measurement:
        return {"next_best": None}
    return {"next_best": dht.next_best_measurement.model_dump()}


@router.get("/{person_id}/observation-history", summary="Raw observation history")
async def get_observation_history(
    person_id: str,
    metric: Optional[str] = Query(None),
    days: int = Query(90, ge=1, le=365),
    caller_id: str = Depends(get_current_user_id),
):
    _audit(caller_id, person_id, "view", f"dht:obs_history:{metric or 'all'}:{days}d")
    obs = dht_store.get_observations(person_id, days=days)
    if metric:
        obs = [o for o in obs if o.metric == metric]
    return {"observations": [o.model_dump(mode="json") for o in obs], "count": len(obs)}


@router.get("/family/{family_id}/map", summary="DHT summaries for all family members")
async def get_family_dht_map(
    family_id: str,
    caller_id: str = Depends(get_current_user_id),
):
    """Returns lightweight DHT summaries for all members of a family."""
    _audit(caller_id, "family:" + family_id, "view", "dht:family_map")
    # Pull all person DHTs that belong to this family_id
    try:
        from app.db.session import create_supabase_client
        client = create_supabase_client()
        resp = client.table("dht_trajectories").select(
            "person_id,overall_direction,confidence,data_quality,computed_at,risk_cards,short_term"
        ).eq("family_id", family_id).execute()
        return {"family_id": family_id, "members": resp.data or []}
    except Exception as e:
        return {"family_id": family_id, "members": [], "error": str(e)}


# ─────────────────────────────────────────────────────────────────────────────
# OCEAN
# ─────────────────────────────────────────────────────────────────────────────

@router.get("/ocean/{person_id}", summary="Get OCEAN profile (latest + history)")
async def get_ocean(
    person_id: str,
    caller_id: str = Depends(get_current_user_id),
):
    _audit(caller_id, person_id, "view", "ocean:profile")
    latest = dht_store.get_latest_ocean(person_id)
    all_versions = dht_store.get_all_ocean_versions(person_id)
    return {
        "latest": latest.model_dump(mode="json") if latest else None,
        "versions": [p.model_dump(mode="json") for p in all_versions],
    }


@router.post("/ocean/{person_id}", summary="Submit new OCEAN quiz results")
async def submit_ocean(
    person_id: str,
    scores: OceanScores,
    background_tasks: BackgroundTasks,
    caller_id: str = Depends(get_current_user_id),
):
    all_versions = dht_store.get_all_ocean_versions(person_id)
    next_version = (max(p.version for p in all_versions) + 1) if all_versions else 1

    profile = OceanProfile(
        person_id=person_id,
        version=next_version,
        scores=scores,
    )
    # Derive behavioral modifiers immediately
    profile.behavioral_modifiers = compute_behavioral_modifiers(scores)
    dht_store.save_ocean_profile(profile)

    # Trigger DHT recompute to apply new OCEAN modifiers
    background_tasks.add_task(_recompute_dht, person_id)
    _audit(caller_id, person_id, "edit", f"ocean:submit:v{next_version}")

    return {"profile_id": profile.profile_id, "version": next_version, "behavioral_modifiers": profile.behavioral_modifiers.model_dump()}


@router.get("/ocean/{person_id}/behavioral-modifiers", summary="Derived behavioral health modifiers")
async def get_behavioral_modifiers(
    person_id: str,
    caller_id: str = Depends(get_current_user_id),
):
    _audit(caller_id, person_id, "view", "ocean:behavioral_modifiers")
    ocean = dht_store.get_latest_ocean(person_id)
    if not ocean:
        return {"modifiers": None, "message": "No OCEAN profile found. Complete the personality quiz first."}
    mods = compute_behavioral_modifiers(ocean.scores)
    return {"modifiers": mods.model_dump(), "ocean_version": ocean.version, "scores": ocean.scores.model_dump()}


# ─────────────────────────────────────────────────────────────────────────────
# Audit Log
# ─────────────────────────────────────────────────────────────────────────────

@router.get("/{person_id}/audit-log", summary="Audit log of all DHT accesses")
async def get_audit(
    person_id: str,
    limit: int = Query(50, le=200),
    caller_id: str = Depends(get_current_user_id),
):
    return {"audit_log": dht_store.get_audit_log(person_id, limit=limit), "count": limit}


# ─────────────────────────────────────────────────────────────────────────────
# WebSocket — Live Updates
# ─────────────────────────────────────────────────────────────────────────────

from fastapi import WebSocket, WebSocketDisconnect
import json as _json


class DHTConnectionManager:
    def __init__(self):
        self._connections: Dict[str, List[WebSocket]] = {}

    async def connect(self, person_id: str, ws: WebSocket):
        await ws.accept()
        self._connections.setdefault(person_id, []).append(ws)

    def disconnect(self, person_id: str, ws: WebSocket):
        if person_id in self._connections:
            self._connections[person_id] = [
                c for c in self._connections[person_id] if c is not ws
            ]

    async def broadcast(self, person_id: str, payload: Dict):
        for ws in self._connections.get(person_id, []):
            try:
                await ws.send_json(payload)
            except Exception:
                pass


_ws_manager = DHTConnectionManager()


@router.websocket("/stream/{person_id}")
async def dht_stream(person_id: str, websocket: WebSocket):
    """WebSocket — pushes dht_update events after each recompute."""
    await _ws_manager.connect(person_id, websocket)
    try:
        # Send current DHT immediately on connect
        dht = dht_store.get_dht(person_id)
        if dht:
            await websocket.send_json({
                "type": "dht_current",
                "payload": dht.model_dump(mode="json"),
            })
        # Keep connection alive
        while True:
            await asyncio.sleep(30)
            await websocket.send_json({"type": "ping"})
    except WebSocketDisconnect:
        _ws_manager.disconnect(person_id, websocket)


# ─────────────────────────────────────────────────────────────────────────────
# Internal helpers
# ─────────────────────────────────────────────────────────────────────────────

async def _recompute_dht(person_id: str) -> Optional[DelphiHealthTrajectory]:
    """Recompute DHT from observations, save, and broadcast."""
    try:
        observations = dht_store.get_observations(person_id, days=90)
        ocean = dht_store.get_latest_ocean(person_id)

        # Try to get family_id from existing dht
        existing = dht_store.get_dht(person_id)
        family_id = existing.family_id if existing else None

        dht = compute_dht(
            person_id=person_id,
            observations=observations,
            ocean_profile=ocean,
            family_id=family_id,
        )
        dht_store.save_dht(dht)
        dht_store.log_audit(AuditEntry(
            actor_id="system",
            person_id=person_id,
            action="compute",
            data_accessed=f"dht:recompute:{len(observations)}obs",
            saint_triggered="dht_engine",
        ))

        # Broadcast update to connected WebSocket clients
        await _ws_manager.broadcast(person_id, {
            "type": "dht_update",
            "payload": {
                "overall_direction": dht.overall_direction,
                "confidence": dht.confidence,
                "risk_count": len(dht.risk_cards),
                "data_quality": dht.data_quality,
                "computed_at": dht.computed_at.isoformat(),
            },
        })
        return dht
    except Exception as e:
        print(f"[DHT] Recompute failed for {person_id}: {e}")
        return None


def _audit(actor_id: str, person_id: str, action: str, data: str) -> None:
    dht_store.log_audit(AuditEntry(
        actor_id=actor_id,
        person_id=person_id,
        action=action,
        data_accessed=data,
    ))
