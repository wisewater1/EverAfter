"""
Health Causal Twin — Database Models
Supports N-of-1 experiments, counterfactual predictions, evidence audit trail,
drift monitoring, and next-best-measurement recommendations.
"""
from sqlalchemy import Column, String, Float, Integer, DateTime, JSON, Text, Boolean, Enum as SQLEnum
from sqlalchemy.dialects.postgresql import UUID
from app.db.session import Base
import uuid
import enum
from datetime import datetime


class ExperimentStatus(str, enum.Enum):
    DRAFT = "draft"
    ACTIVE = "active"
    PAUSED = "paused"
    COMPLETED = "completed"
    CANCELLED = "cancelled"


class EvidenceType(str, enum.Enum):
    CAUSAL_TRIAL = "causal_trial"
    STRONG_CORRELATION = "strong_correlation"
    WEAK_CORRELATION = "weak_correlation"
    POPULATION_PRIOR = "population_prior"
    CLINICIAN_ENTERED = "clinician_entered"


class ModelStatus(str, enum.Enum):
    STABLE = "stable"
    LEARNING = "learning"
    DEGRADED = "degraded"
    RECALIBRATING = "recalibrating"


class Experiment(Base):
    """N-of-1 A/B trial — alternates small lifestyle changes and measures response."""
    __tablename__ = "causal_experiments"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(String, nullable=False, index=True)
    name = Column(String, nullable=False)
    description = Column(Text)
    intervention_a = Column(String, nullable=False)  # e.g. "No caffeine after 2pm"
    intervention_b = Column(String, nullable=False)  # e.g. "Normal caffeine intake"
    outcome_metrics = Column(JSON, nullable=False)    # ["sleep_quality", "hrv", "mood"]
    duration_days = Column(Integer, nullable=False, default=14)
    status = Column(String, nullable=False, default=ExperimentStatus.DRAFT.value)
    schedule = Column(JSON)       # Per-day A/B assignment: [{"day":1,"arm":"A"}, ...]
    adherence_log = Column(JSON, default=list)
    results = Column(JSON)        # Post-experiment: effect_estimate, confidence, recommendation
    safety_approved = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    started_at = Column(DateTime)
    completed_at = Column(DateTime)


class ExperimentDay(Base):
    """Per-day schedule and compliance for an experiment."""
    __tablename__ = "causal_experiment_days"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    experiment_id = Column(UUID(as_uuid=True), nullable=False, index=True)
    day_number = Column(Integer, nullable=False)
    assigned_arm = Column(String, nullable=False)     # "A" or "B"
    adherence_status = Column(String, default="pending")  # pending, adhered, missed, partial
    metric_values = Column(JSON)   # Outcome measurements for this day
    notes = Column(Text)
    recorded_at = Column(DateTime)


class Prediction(Base):
    """Counterfactual forecast — 'What if you changed X for N days?'"""
    __tablename__ = "causal_predictions"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(String, nullable=False, index=True)
    scenario_name = Column(String)
    behavior_changes = Column(JSON, nullable=False)    # {"sleep_hours": 7.5, "steps": 8000}
    metrics_projected = Column(JSON, nullable=False)   # {"resting_hr": {...}, "mood": {...}}
    confidence_bands = Column(JSON)  # Per-metric: {low, mid, high} at each horizon
    horizon_days = Column(JSON, default=[3, 7, 14, 30])
    evidence_type = Column(String, default=EvidenceType.WEAK_CORRELATION.value)
    data_sufficiency = Column(Float, default=0.0)      # 0-1 score
    created_at = Column(DateTime, default=datetime.utcnow)


class EvidenceLedgerEntry(Base):
    """Immutable recommendation audit record."""
    __tablename__ = "causal_evidence_ledger"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(String, nullable=False, index=True)
    recommendation_text = Column(Text, nullable=False)
    data_sources = Column(JSON, nullable=False)        # ["wearable:fitbit", "journal:mood", ...]
    model_version = Column(String, nullable=False, default="v1.0.0")
    confidence = Column(Float, nullable=False)
    evidence_type = Column(String, nullable=False)
    failure_history = Column(JSON, default=list)        # Past failures of this recommendation
    contradictions = Column(JSON, default=list)         # Contradicting evidence
    created_at = Column(DateTime, default=datetime.utcnow)


class DriftEvent(Base):
    """Model quality change log."""
    __tablename__ = "causal_drift_events"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(String, nullable=False, index=True)
    trigger = Column(String, nullable=False)           # "schedule_change", "medication", "illness"
    metric_affected = Column(String)
    old_accuracy = Column(Float)
    new_accuracy = Column(Float)
    status = Column(String, default=ModelStatus.DEGRADED.value)
    recalibration_started_at = Column(DateTime)
    recalibration_completed_at = Column(DateTime)
    details = Column(JSON)
    created_at = Column(DateTime, default=datetime.utcnow)


class MeasurementRecommendation(Base):
    """Ranked next-best data source to reduce prediction uncertainty."""
    __tablename__ = "causal_measurement_recommendations"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(String, nullable=False, index=True)
    measurement_type = Column(String, nullable=False)  # "cgm_trial", "lab_panel", "sleep_journal"
    expected_info_gain = Column(Float, nullable=False)  # 0-1 score
    rationale = Column(Text, nullable=False)
    priority_rank = Column(Integer, nullable=False)
    improves_predictions_for = Column(JSON)  # ["glucose_variability", "fatigue"]
    is_dismissed = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.utcnow)
