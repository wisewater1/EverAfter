from sqlalchemy import Column, String, Float, Integer, DateTime, JSON, Text, Boolean, ForeignKey
from sqlalchemy.dialects.postgresql import UUID
from app.db.session import Base
import uuid
import enum
from datetime import datetime

class ProposalStatus(str, enum.Enum):
    PENDING = "pending"
    RATIFIED = "ratified"
    VETOED = "vetoed"
    EXPIRED = "expired"

class ProposalType(str, enum.Enum):
    EXPERIMENT = "experiment"
    PROTOCOL_CHANGE = "protocol_change"
    MEASUREMENT_REQUIRED = "measurement_required"

class GovernanceProposal(Base):
    """AI-suggested health governance actions requiring user ratification."""
    __tablename__ = "governance_proposals"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(String, nullable=False, index=True)
    type = Column(String, nullable=False)  # ProposalType
    title = Column(String, nullable=False)
    description = Column(Text, nullable=False)
    rationale = Column(Text)
    parameters = Column(JSON)  # Detail payload for the proposal
    status = Column(String, default=ProposalStatus.PENDING.value)
    confidence_score = Column(Float)
    priority = Column(Integer, default=0)
    created_at = Column(DateTime, default=datetime.utcnow)
    decided_at = Column(DateTime)
    metadata = Column(JSON)

class HealthProtocol(Base):
    """User-ratified health 'laws' or recurring rules."""
    __tablename__ = "governance_protocols"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(String, nullable=False, index=True)
    name = Column(String, nullable=False)
    description = Column(Text)
    rule_type = Column(String, nullable=False)  # e.g., "threshold", "schedule"
    parameters = Column(JSON, nullable=False)    # e.g., {"metric": "sleep_hours", "min": 7}
    is_active = Column(Boolean, default=True)
    ratified_at = Column(DateTime, default=datetime.utcnow)
    last_violation_at = Column(DateTime)
    violation_count = Column(Integer, default=0)
    governance_id = Column(UUID(as_uuid=True), ForeignKey("governance_proposals.id"))
