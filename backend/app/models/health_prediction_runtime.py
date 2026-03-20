import uuid

from sqlalchemy import Column, DateTime, JSON, String
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
