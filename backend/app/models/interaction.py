from sqlalchemy import Column, String, Integer, DateTime, Float, JSON, ForeignKey, ARRAY
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.sql import func
from app.db.session import Base
import uuid

class AgentInteraction(Base):
    __tablename__ = "agent_interactions"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    initiator_id = Column(UUID(as_uuid=True), ForeignKey("archetypal_ais.id", ondelete="CASCADE"), nullable=False)
    receiver_id = Column(UUID(as_uuid=True), ForeignKey("archetypal_ais.id", ondelete="CASCADE"), nullable=False)
    
    # Context of the interaction (e.g., "Board Meeting", "Casual Encounter")
    interaction_type = Column(String, default="casual")
    
    # Full conversation history as JSON
    # Format: [{"role": "Gabriel", "content": "..."}, {"role": "Raphael", "content": "..."}]
    conversation_log = Column(JSON, default=list)
    
    # IDs of memories that were shared or discussed during this interaction
    shared_memory_ids = Column(ARRAY(UUID(as_uuid=True)), default=list)
    
    # Sentiment and rapport tracking
    sentiment_score = Column(Float, default=0.0) # -1.0 to 1.0
    # Nullable with no default. Nothing in this codebase measures rapport, so an
    # unset value must read as "not measured" rather than silently becoming a
    # mid-scale 0.5 that the social feed renders as a real percentage.
    emotional_rapport = Column(Float, nullable=True, default=None) # 0.0 to 1.0 (closeness), null when unmeasured
    
    # Summary of the outcome (for the social feed)
    summary = Column(String)
    
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
