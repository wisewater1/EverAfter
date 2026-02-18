"""
Saint Knowledge Model

Stores per-user per-saint knowledge that each saint agent learns
about the user across conversations. This enables saints to remember
facts, preferences, and context specific to their domain.
"""

from sqlalchemy import Column, String, Text, Float, DateTime, ForeignKey
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.sql import func
from app.db.session import Base
import uuid


class SaintKnowledge(Base):
    __tablename__ = "saint_knowledge"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), nullable=False, index=True)
    saint_id = Column(String, nullable=False, index=True)  # 'raphael', 'michael', 'joseph', 'martin', 'agatha'
    engram_id = Column(UUID(as_uuid=True), ForeignKey("archetypal_ais.id", ondelete="CASCADE"), nullable=True)
    knowledge_key = Column(String, nullable=False)  # e.g. 'family_members', 'security_preferences'
    knowledge_value = Column(Text, nullable=False)  # The actual information
    category = Column(String, nullable=False, default="general")  # domain-specific category
    confidence = Column(Float, default=1.0)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
