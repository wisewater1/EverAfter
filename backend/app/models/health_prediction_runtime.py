import uuid

from sqlalchemy import Column, DateTime, Float, Integer, JSON, String
from sqlalchemy.sql import func

from app.db.session import Base


def generate_cuid() -> str:
    return f"c{uuid.uuid4().hex[:24]}"


class HealthPredictionScenario(Base):
    __tablename__ = "health_prediction_scenarios"

    id = Column(String, primary_key=True, default=generate_cuid)
    owner_user_id = Column(String, nullable=False, index=True)
    scope = Column(String, nullable=False, default="private")
    family_member_id = Column(String, nullable=True)
    name = Column(String, nullable=False)
    interventions_json = Column(JSON, nullable=False)
    baseline_snapshot_json = Column(JSON, nullable=True)
    projected_outputs_json = Column(JSON, nullable=True)
    source_references_json = Column(JSON, nullable=True)
    medication_watchouts_json = Column(JSON, nullable=True)
    cloned_from_id = Column(String, nullable=True)
    created_at = Column(DateTime, default=func.now(), nullable=False)
    updated_at = Column(DateTime, default=func.now(), onupdate=func.now(), nullable=False)


class DelphiTrajectory(Base):
    __tablename__ = "delphi_trajectories"

    id = Column(String, primary_key=True, default=generate_cuid)
    user_id = Column(String, nullable=False, index=True)
    prediction_type = Column(String, nullable=False, default="composite_health")
    predicted_value = Column(Float, nullable=False, default=0.0)
    confidence = Column(Float, nullable=False, default=0.0)
    risk_level = Column(String, nullable=False, default="unknown")
    contributing_factors = Column(JSON, nullable=False, default=list)
    trajectory_data = Column(JSON, nullable=False, default=list)
    metrics_used = Column(Integer, nullable=False, default=0)
    data_source = Column(String, nullable=False, default="live")
    generated_at = Column(DateTime, default=func.now(), nullable=False)
    created_at = Column(DateTime, default=func.now(), nullable=False)
