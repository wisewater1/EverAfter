"""Shareable personality-quiz invites.

Lets an owner generate a tokenized link so a friend or relative — on their own
device, without an EverAfter account — can answer the personality questions for
a subject. The answers and computed profile are stored server-side keyed by the
token, so results flow back to the owner. This is the durable backing the
localStorage-only quiz lacked.
"""

import uuid

from sqlalchemy import Column, DateTime, String
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.sql import func

from app.db.session import Base


class QuizInvite(Base):
    __tablename__ = "quiz_invites"

    # High-entropy, URL-safe share token (the only thing the friend needs).
    token = Column(String, primary_key=True)
    owner_user_id = Column(UUID(as_uuid=True), nullable=False, index=True, default=uuid.uuid4)
    # Who the quiz is about (display only — shown to the friend).
    subject_name = Column(String, nullable=False, default="a loved one")
    # The owner's local family-member id, so results can be matched back.
    subject_member_id = Column(String, nullable=True)
    # 'pending' until the friend submits, then 'completed'.
    status = Column(String, nullable=False, default="pending")
    answers = Column(JSONB, nullable=True)
    profile = Column(JSONB, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    completed_at = Column(DateTime(timezone=True), nullable=True)
