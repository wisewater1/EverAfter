"""
Delphi Health Trajectory — Data Models
=======================================
Pydantic models representing all DHT entities.
Used by the DHT engine, API, and frontend serialisation.
"""

from __future__ import annotations

from datetime import datetime
from typing import Any, Dict, List, Literal, Optional, Union
from pydantic import BaseModel, Field
import uuid


# ─────────────────────────────────────────────────────────────────────────────
# OCEAN / Personality
# ─────────────────────────────────────────────────────────────────────────────

class OceanScores(BaseModel):
    O: float = Field(50.0, ge=0, le=100, description="Openness 0–100")
    C: float = Field(50.0, ge=0, le=100, description="Conscientiousness")
    E: float = Field(50.0, ge=0, le=100, description="Extraversion")
    A: float = Field(50.0, ge=0, le=100, description="Agreeableness")
    N: float = Field(50.0, ge=0, le=100, description="Neuroticism")


class BehavioralModifiers(BaseModel):
    """Derived from OCEAN scores — drives intervention tone, alert style, plan format."""
    adherence_risk: float            # 0–1 (high N + low C → higher risk)
    alert_sensitivity: Literal["calm", "moderate", "high"]
    intervention_style: Literal["structured", "exploratory", "supportive"]
    checklist_preference: bool        # high C → True
    alarm_fatigue_risk: float         # high N → elevated
    nudge_frequency: Literal["low", "moderate", "high"]


class OceanProfile(BaseModel):
    profile_id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    person_id: str
    version: int = 1
    taken_at: datetime = Field(default_factory=datetime.utcnow)
    scores: OceanScores
    behavioral_modifiers: Optional[BehavioralModifiers] = None


# ─────────────────────────────────────────────────────────────────────────────
# Observation (raw data point)
# ─────────────────────────────────────────────────────────────────────────────

ObservationCategory = Literal[
    "vital", "lab", "med", "diagnosis", "symptom",
    "activity", "sleep", "nutrition", "cgm", "event"
]

ObservationSource = Literal[
    "manual", "wearable", "lab", "ehr", "cgm", "user_event", "scheduled"
]

class Observation(BaseModel):
    obs_id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    person_id: str
    family_id: Optional[str] = None
    source: ObservationSource
    category: ObservationCategory
    metric: str                       # e.g. "hrv_ms", "glucose_mmol", "steps"
    value: Union[float, str]
    unit: str = ""
    recorded_at: datetime = Field(default_factory=datetime.utcnow)
    sync_at: datetime = Field(default_factory=datetime.utcnow)
    confidence: float = 1.0           # 0–1
    tags: List[str] = Field(default_factory=list)
    notes: Optional[str] = None


# ─────────────────────────────────────────────────────────────────────────────
# DHT — Derived outputs
# ─────────────────────────────────────────────────────────────────────────────

TrajectoryDirection = Literal["improving", "stable", "declining", "critical", "unknown"]
RiskLevel = Literal["low", "moderate", "high", "critical"]
DeltaArrow = Literal["↑", "↓", "→"]

class TrajectoryWindow(BaseModel):
    horizon: Literal["short", "mid", "long"]   # 7-30d, 3-12mo, 1-5y
    direction: TrajectoryDirection
    magnitude: float                            # 0–1 normalised
    confidence: float                           # 0–1
    uncertainty_lower: float
    uncertainty_upper: float
    narrative: str                              # plain-English summary
    key_drivers: List[str] = Field(default_factory=list)


class RiskCard(BaseModel):
    domain: str                                 # cardiovascular, metabolic, mental, ...
    current_level: RiskLevel
    direction: DeltaArrow
    delta_30d: float                            # signed % change
    what_moved_it: List[str] = Field(default_factory=list)
    confidence: float
    ocean_modifier: float                       # personality adjustment factor (±)
    suggested_action: Optional[str] = None


class Indicator(BaseModel):
    """A leading health signal driving current risk or resilience."""
    metric: str
    label: str
    value: Union[float, str]
    unit: str
    trend: DeltaArrow
    impact: Literal["positive", "negative", "neutral"]
    delta_7d: Optional[float] = None
    delta_30d: Optional[float] = None


class NextBestMeasurement(BaseModel):
    metric: str
    label: str
    reason: str
    uncertainty_reduction_pct: float            # est. reduction in DHT uncertainty
    last_measured: Optional[datetime] = None
    days_since_last: Optional[int] = None
    suggested_source: Optional[str] = None     # e.g. "blood draw", "wearable", "manual"


class TrendBreak(BaseModel):
    metric: str
    detected_at: datetime
    magnitude: float
    direction: DeltaArrow
    confidence: float


class Anomaly(BaseModel):
    metric: str
    value: float
    expected_range: tuple[float, float]
    zscore: float
    detected_at: datetime
    severity: Literal["minor", "moderate", "severe"]


# ─────────────────────────────────────────────────────────────────────────────
# Main DHT Object
# ─────────────────────────────────────────────────────────────────────────────

class DelphiHealthTrajectory(BaseModel):
    dht_id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    person_id: str
    family_id: Optional[str] = None
    computed_at: datetime = Field(default_factory=datetime.utcnow)
    data_freshness_seconds: int = 0
    observation_count: int = 0
    data_quality: Literal["rich", "moderate", "sparse", "empty"] = "sparse"

    # Derived features (internal — summarised for API consumers)
    baselines: Dict[str, float] = Field(default_factory=dict)
    rolling_deltas_7d: Dict[str, float] = Field(default_factory=dict)
    rolling_deltas_30d: Dict[str, float] = Field(default_factory=dict)
    variability: Dict[str, float] = Field(default_factory=dict)
    adherence_signals: Dict[str, float] = Field(default_factory=dict)
    trend_breaks: List[TrendBreak] = Field(default_factory=list)
    anomalies: List[Anomaly] = Field(default_factory=list)
    context_tags: List[str] = Field(default_factory=list)

    # Trajectory outputs
    short_term: Optional[TrajectoryWindow] = None   # 7–30d
    mid_term: Optional[TrajectoryWindow] = None     # 3–12mo
    long_term: Optional[TrajectoryWindow] = None    # 1–5y
    overall_direction: TrajectoryDirection = "unknown"

    # Risk cards, indicators, next-best
    risk_cards: List[RiskCard] = Field(default_factory=list)
    leading_indicators: List[Indicator] = Field(default_factory=list)
    next_best_measurement: Optional[NextBestMeasurement] = None

    # Global confidence
    confidence: float = 0.0
    uncertainty_lower: float = 0.0
    uncertainty_upper: float = 1.0

    # Saint events (audit trail)
    saint_notes: List[str] = Field(default_factory=list)

    # OCEAN overlay (set externally when behavioral layer is requested)
    ocean_version: Optional[int] = None
    behavioral_modifiers: Optional[BehavioralModifiers] = None


# ─────────────────────────────────────────────────────────────────────────────
# Consent Record
# ─────────────────────────────────────────────────────────────────────────────

class ConsentRecord(BaseModel):
    person_id: str
    granted_by: str
    can_view_raw: List[str] = Field(default_factory=list)      # person_ids
    can_view_summary: List[str] = Field(default_factory=list)
    can_edit: List[str] = Field(default_factory=list)
    alert_targets: List[str] = Field(default_factory=list)
    society_opt_in: bool = False
    clinician_access: List[str] = Field(default_factory=list)
    updated_at: datetime = Field(default_factory=datetime.utcnow)


class AuditEntry(BaseModel):
    timestamp: datetime = Field(default_factory=datetime.utcnow)
    actor_id: str
    person_id: str
    action: Literal["view", "edit", "alert", "export", "compute"]
    data_accessed: str
    reason: Optional[str] = None
    saint_triggered: Optional[str] = None


# ─────────────────────────────────────────────────────────────────────────────
# API Request / Response schemas
# ─────────────────────────────────────────────────────────────────────────────

class ObserveRequest(BaseModel):
    person_id: str
    metric: str
    value: Union[float, str]
    unit: str = ""
    source: ObservationSource = "manual"
    category: ObservationCategory = "vital"
    tags: List[str] = Field(default_factory=list)
    notes: Optional[str] = None
    recorded_at: Optional[datetime] = None


class ObserveBatchRequest(BaseModel):
    person_id: str
    observations: List[ObserveRequest]


class UserEventRequest(BaseModel):
    person_id: str
    type: str                         # stress | illness | travel | missed_med | ...
    severity: Literal["low", "moderate", "high"] = "moderate"
    note: Optional[str] = None


class ObserveResponse(BaseModel):
    obs_id: str
    queued: bool = True
    estimated_refresh_seconds: int = 60


class DHTResponse(BaseModel):
    """What the API returns — the full DHT object."""
    dht: DelphiHealthTrajectory
    stale: bool = False
    last_observation_at: Optional[datetime] = None
