"""
Pydantic schemas for Health Causal Twin API requests and responses.
"""
from pydantic import BaseModel, Field
from typing import Dict, Any, List, Optional
from datetime import datetime


# --- Simulation ---

class SimulationRequest(BaseModel):
    behavior_changes: Dict[str, float] = Field(
        ..., description="e.g. {'sleep_hours': 7.5, 'steps': 8000}"
    )
    target_metrics: Optional[List[str]] = None
    horizons: Optional[List[int]] = Field(None, description="Forecast days e.g. [3, 7, 14, 30]")


class ConfidenceReport(BaseModel):
    score: float
    level: str
    explanation: str
    breakdown: Optional[Dict[str, float]] = None


class EvidenceLabel(BaseModel):
    type: str
    label: str
    is_causal: bool


class SimulationResponse(BaseModel):
    scenario: Dict[str, float]
    projections: Dict[str, Any]
    horizons: List[int]
    confidence: ConfidenceReport
    evidence: EvidenceLabel
    narrative: str
    disclaimer: str
    generated_at: str


# --- Experiments ---

class ExperimentCreate(BaseModel):
    name: str
    intervention_a: str = Field(..., description="e.g. 'No caffeine after 2pm'")
    intervention_b: str = Field(..., description="e.g. 'Normal caffeine intake'")
    outcome_metrics: List[str] = Field(..., description="e.g. ['sleep_quality', 'hrv', 'mood']")
    duration_days: int = Field(14, ge=3, le=90)
    description: str = ""


class AdherenceLog(BaseModel):
    day_number: int = Field(..., ge=1)
    adhered: bool
    metric_values: Optional[Dict[str, float]] = None
    notes: str = ""


class ExperimentUpdate(BaseModel):
    action: str = Field(..., description="'start', 'pause', 'resume', 'complete'")


# --- Evidence Ledger ---

class EvidenceEntry(BaseModel):
    id: str
    user_id: str
    recommendation_text: str
    data_sources: List[str]
    model_version: str
    confidence: float
    evidence_type: str
    failure_history: List[Any]
    contradictions: List[Any]
    created_at: str


# --- Drift / Model Health ---

class DriftStatus(BaseModel):
    status: str
    accuracy: float
    accuracy_trend: List[Dict[str, Any]]
    last_checked: str
    predictions_evaluated: int
    last_drift_event: Optional[str]
    recalibrating_since: Optional[str]
    status_description: str


# --- Measurement Recommendations ---

class MeasurementSuggestion(BaseModel):
    measurement_type: str
    label: str
    description: str
    category: str
    expected_info_gain: float
    improves_predictions_for: List[str]
    effort: str
    duration: str
    rationale: str
    priority_rank: int
