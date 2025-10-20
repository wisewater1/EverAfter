from sqlalchemy import Column, String, Integer, Boolean, DateTime, Text, ARRAY, Float, JSON, ForeignKey
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.sql import func
from app.db.session import Base
import uuid


class Engram(Base):
    __tablename__ = "engrams"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), nullable=False)
    engram_type = Column(String, nullable=False)
    name = Column(String, nullable=False)
    email = Column(String)
    relationship = Column(String, nullable=False)
    avatar_url = Column(String)
    description = Column(Text, default="")
    personality_summary = Column(JSON, default=dict)
    total_questions_answered = Column(Integer, default=0)
    ai_readiness_score = Column(Integer, default=0)
    is_ai_active = Column(Boolean, default=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())


class EngramDailyResponse(Base):
    __tablename__ = "engram_daily_responses"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    engram_id = Column(UUID(as_uuid=True), ForeignKey("engrams.id", ondelete="CASCADE"), nullable=False)
    user_id = Column(UUID(as_uuid=True), nullable=False)
    question_id = Column(UUID(as_uuid=True))
    question_text = Column(Text, nullable=False)
    response_text = Column(Text, nullable=False)
    question_category = Column(String, nullable=False)
    day_number = Column(Integer, nullable=False)
    mood = Column(String)
    personality_tags = Column(JSON, default=list)
    embedding_generated = Column(Boolean, default=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())


class EngramPersonalityFilter(Base):
    __tablename__ = "engram_personality_filters"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    engram_id = Column(UUID(as_uuid=True), ForeignKey("engrams.id", ondelete="CASCADE"), nullable=False)
    filter_category = Column(String, nullable=False)
    filter_name = Column(String, nullable=False)
    filter_value = Column(Text, nullable=False)
    confidence_score = Column(Float, default=0.5)
    source_response_ids = Column(ARRAY(UUID(as_uuid=True)), default=list)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())


class EngramProgress(Base):
    __tablename__ = "engram_progress"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    engram_id = Column(UUID(as_uuid=True), ForeignKey("engrams.id", ondelete="CASCADE"), unique=True, nullable=False)
    current_day = Column(Integer, default=1)
    total_responses = Column(Integer, default=0)
    streak_days = Column(Integer, default=0)
    last_response_date = Column(DateTime(timezone=True))
    categories_covered = Column(JSON, default=dict)
    started_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())


class AIConversation(Base):
    __tablename__ = "ai_conversations"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    engram_id = Column(UUID(as_uuid=True), ForeignKey("engrams.id", ondelete="CASCADE"), nullable=False)
    user_id = Column(UUID(as_uuid=True), nullable=False)
    title = Column(String, default="New Conversation")
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())


class AIMessage(Base):
    __tablename__ = "ai_messages"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    conversation_id = Column(UUID(as_uuid=True), ForeignKey("ai_conversations.id", ondelete="CASCADE"), nullable=False)
    role = Column(String, nullable=False)
    content = Column(Text, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())


class EngramAITask(Base):
    __tablename__ = "engram_ai_tasks"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    engram_id = Column(UUID(as_uuid=True), ForeignKey("engrams.id", ondelete="CASCADE"), nullable=False)
    task_name = Column(String, nullable=False)
    task_description = Column(Text, nullable=False)
    task_type = Column(String, nullable=False)
    frequency = Column(String, default="on_demand")
    is_active = Column(Boolean, default=True)
    last_executed = Column(DateTime(timezone=True))
    execution_log = Column(JSON, default=list)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
