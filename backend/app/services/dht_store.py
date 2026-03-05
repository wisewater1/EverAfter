"""
DHT Supabase Store — read/write helpers for DHT-related tables.
All data persists in Supabase (PostgreSQL via REST).
"""
from __future__ import annotations

import json
from datetime import datetime
from typing import Any, Dict, List, Optional

from app.db.session import create_supabase_client
from app.models.dht import (
    AuditEntry, ConsentRecord, DelphiHealthTrajectory,
    Observation, OceanProfile, OceanScores, BehavioralModifiers,
)


def _client():
    return create_supabase_client()


# ─────────────────────────────────────────────────────────────────────────────
# Observations
# ─────────────────────────────────────────────────────────────────────────────

def save_observation(obs: Observation) -> str:
    """Insert a new observation; returns obs_id."""
    try:
        client = _client()
        data = obs.model_dump(mode="json")
        client.table("dht_observations").insert(data).execute()
    except Exception:
        pass  # graceful — queue handles recompute regardless
    return obs.obs_id


def get_observations(person_id: str, days: int = 90) -> List[Observation]:
    """Fetch observations for a person from the last N days."""
    try:
        client = _client()
        cutoff = (datetime.utcnow() - __import__("datetime").timedelta(days=days)).isoformat()
        resp = (
            client.table("dht_observations")
            .select("*")
            .eq("person_id", person_id)
            .gte("recorded_at", cutoff)
            .execute()
        )
        return [Observation(**row) for row in (resp.data or [])]
    except Exception:
        return []


# ─────────────────────────────────────────────────────────────────────────────
# DHT Cache
# ─────────────────────────────────────────────────────────────────────────────

def save_dht(dht: DelphiHealthTrajectory) -> None:
    """Upsert DHT object (one row per person_id)."""
    try:
        client = _client()
        data = dht.model_dump(mode="json")
        client.table("dht_trajectories").upsert(data, on_conflict="person_id").execute()
    except Exception:
        pass


def get_dht(person_id: str) -> Optional[DelphiHealthTrajectory]:
    """Retrieve cached DHT for a person."""
    try:
        client = _client()
        resp = (
            client.table("dht_trajectories")
            .select("*")
            .eq("person_id", person_id)
            .single()
            .execute()
        )
        if resp.data:
            return DelphiHealthTrajectory(**resp.data)
    except Exception:
        pass
    return None


# ─────────────────────────────────────────────────────────────────────────────
# OCEAN Profiles
# ─────────────────────────────────────────────────────────────────────────────

def save_ocean_profile(profile: OceanProfile) -> None:
    """Insert a versioned OCEAN profile (immutable after submission)."""
    try:
        client = _client()
        data = profile.model_dump(mode="json")
        client.table("ocean_profiles").insert(data).execute()
    except Exception:
        pass


def get_latest_ocean(person_id: str) -> Optional[OceanProfile]:
    """Fetch the most recent OCEAN profile for a person."""
    try:
        client = _client()
        resp = (
            client.table("ocean_profiles")
            .select("*")
            .eq("person_id", person_id)
            .order("version", desc=True)
            .limit(1)
            .execute()
        )
        if resp.data:
            row = resp.data[0]
            scores = OceanScores(**row.pop("scores", {}))
            bm_raw = row.pop("behavioral_modifiers", None)
            bm = BehavioralModifiers(**bm_raw) if bm_raw else None
            return OceanProfile(**row, scores=scores, behavioral_modifiers=bm)
    except Exception:
        pass
    return None


def get_all_ocean_versions(person_id: str) -> List[OceanProfile]:
    try:
        client = _client()
        resp = (
            client.table("ocean_profiles")
            .select("*")
            .eq("person_id", person_id)
            .order("version", desc=True)
            .execute()
        )
        profiles = []
        for row in (resp.data or []):
            try:
                scores = OceanScores(**row.pop("scores", {}))
                bm_raw = row.pop("behavioral_modifiers", None)
                bm = BehavioralModifiers(**bm_raw) if bm_raw else None
                profiles.append(OceanProfile(**row, scores=scores, behavioral_modifiers=bm))
            except Exception:
                continue
        return profiles
    except Exception:
        return []


# ─────────────────────────────────────────────────────────────────────────────
# Consent Records
# ─────────────────────────────────────────────────────────────────────────────

def get_consent(person_id: str) -> Optional[ConsentRecord]:
    try:
        client = _client()
        resp = (
            client.table("dht_consents")
            .select("*")
            .eq("person_id", person_id)
            .single()
            .execute()
        )
        if resp.data:
            return ConsentRecord(**resp.data)
    except Exception:
        pass
    return None


def save_consent(consent: ConsentRecord) -> None:
    try:
        client = _client()
        client.table("dht_consents").upsert(
            consent.model_dump(mode="json"), on_conflict="person_id"
        ).execute()
    except Exception:
        pass


# ─────────────────────────────────────────────────────────────────────────────
# Audit Log
# ─────────────────────────────────────────────────────────────────────────────

def log_audit(entry: AuditEntry) -> None:
    try:
        client = _client()
        client.table("dht_audit_log").insert(entry.model_dump(mode="json")).execute()
    except Exception:
        pass


def get_audit_log(person_id: str, limit: int = 50) -> List[Dict]:
    try:
        client = _client()
        resp = (
            client.table("dht_audit_log")
            .select("*")
            .eq("person_id", person_id)
            .order("timestamp", desc=True)
            .limit(limit)
            .execute()
        )
        return resp.data or []
    except Exception:
        return []
