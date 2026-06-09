"""
Pydantic schemas for the Shared Health Prediction system.
Used by both St. Raphael (individual health) and St. Joseph (family health).
"""
from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any
from datetime import datetime
from enum import Enum


# ── Enums ──────────────────────────────────────────────────────────

class RiskLevel(str, Enum):
    LOW = "low"
    MODERATE = "moderate"
    HIGH = "high"
    CRITICAL = "critical"


class ConfidenceLevel(str, Enum):
    HIGH = "high"
    MODERATE = "moderate"
    LOW = "low"


class EvidenceType(str, Enum):
    CAUSAL_TRIAL = "causal_trial"
    STRONG_CORRELATION = "strong_correlation"
    WEAK_CORRELATION = "weak_correlation"
    POPULATION_PRIOR = "population_prior"
    CLINICIAN_ENTERED = "clinician_entered"
    MEDICAL_TWIN = "medical_twin"


class TrendDirection(str, Enum):
    IMPROVING = "improving"
    DECLINING = "declining"
    STABLE = "stable"
    UNKNOWN = "unknown"


# ── Uncertainty Metadata ───────────────────────────────────────────

class UncertaintyMeta(BaseModel):
    confidence_score: float = Field(..., ge=0, le=100, description="0-100 confidence")
    confidence_level: ConfidenceLevel
    evidence_type: EvidenceType
    data_days: int = Field(0, description="Days of data backing this prediction")
    data_completeness: float = Field(0.0, ge=0, le=1, description="0-1 completeness ratio")
    explanation: str = ""


# ── Prediction Structures ─────────────────────────────────────────

class TrajectoryPoint(BaseModel):
    timestamp: datetime
    value: float
    confidence: float = Field(0.5, ge=0, le=1)


class RiskFactor(BaseModel):
    factor: str
    weight: float = Field(..., ge=0, le=1, description="Contribution weight 0-1")
    source: str = "population_prior"


class PredictionBundle(BaseModel):
    """Single-user health prediction with full uncertainty metadata."""
    user_id: str
    metric: str
    predicted_value: float
    risk_level: RiskLevel
    trend: TrendDirection
    risk_factors: List[RiskFactor] = []
    trajectory: List[TrajectoryPoint] = []
    uncertainty: UncertaintyMeta
    recommendations: List[str] = []
    generated_at: datetime = Field(default_factory=datetime.utcnow)


class MemberPrediction(BaseModel):
    """One family member's prediction within a family bundle."""
    member_id: str
    member_name: str
    consent_granted: bool = True
    prediction: Optional[PredictionBundle] = None
    early_warnings: List["EarlyWarning"] = []


class FamilyPredictionBundle(BaseModel):
    """Family-wide prediction aggregating all consented members."""
    family_id: str
    aggregate_risk: RiskLevel
    aggregate_score: float = Field(..., ge=0, le=100)
    member_predictions: List[MemberPrediction] = []
    shared_risk_factors: List[RiskFactor] = []
    uncertainty: UncertaintyMeta
    generated_at: datetime = Field(default_factory=datetime.utcnow)


# ── Early Warnings ────────────────────────────────────────────────

class EarlyWarning(BaseModel):
    warning_id: str
    user_id: str
    metric: str
    severity: RiskLevel
    trend: TrendDirection
    message: str
    recommended_action: str
    confidence: float = Field(..., ge=0, le=100)
    detected_at: datetime = Field(default_factory=datetime.utcnow)


# ── Scenario Simulation ──────────────────────────────────────────

class ScenarioParam(BaseModel):
    metric: str
    change_type: str = "increase"  # increase, decrease, maintain
    change_value: float = 0.0
    duration_days: int = 30


class SimulationResult(BaseModel):
    scenario_id: str
    user_id: str
    params: List[ScenarioParam]
    predicted_outcome: Dict[str, float] = {}
    risk_change: Dict[str, str] = {}  # metric -> "improved" | "worsened" | "unchanged"
    confidence_interval: Dict[str, List[float]] = {}  # metric -> [low, mid, high]
    uncertainty: UncertaintyMeta
    narrative: str = ""  # LLM-generated natural language summary
    generated_at: datetime = Field(default_factory=datetime.utcnow)


# ── Consent ───────────────────────────────────────────────────────

class ConsentEntry(BaseModel):
    member_id: str
    consent_granted: bool


class ConsentUpdateRequest(BaseModel):
    consents: List[ConsentEntry]


# ── API Request Models ────────────────────────────────────────────

class PredictUserRequest(BaseModel):
    metrics_history: List[Dict[str, Any]] = []
    profile: Optional[Dict[str, Any]] = None


class PredictFamilyRequest(BaseModel):
    members: List[Dict[str, Any]] = []
    consent_map: Dict[str, bool] = {}


class SimulateRequest(BaseModel):
    scenarios: List[ScenarioParam]
    baseline_metrics: List[Dict[str, Any]] = []


# Rebuild forward refs for nested model
MemberPrediction.model_rebuild()
