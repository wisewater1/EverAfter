from sqlalchemy import Column, String, Integer, Boolean, DateTime, Text, ARRAY, Float, JSON, ForeignKey
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.sql import func
from app.db.session import Base
import uuid


class ArchetypalAI(Base):
    __tablename__ = "archetypal_ais"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), nullable=False)
    name = Column(String, nullable=False)
    description = Column(Text, default="My personal AI created from my memories and experiences")
    personality_traits = Column(JSON, default=dict)
    total_memories = Column(Integer, default=0)
    training_status = Column(String, default='untrained')
    avatar_url = Column(String)
    dimension_scores = Column(JSON, default=dict)
    completeness_by_category = Column(JSON, default=dict)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())


class DailyQuestionResponse(Base):
    __tablename__ = "daily_question_responses"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), nullable=False)
    question_id = Column(UUID(as_uuid=True))
    question_text = Column(Text, nullable=False)
    response_text = Column(Text, nullable=False)
    day_number = Column(Integer, nullable=False)
    mood = Column(String)
    dimension_id = Column(UUID(as_uuid=True), ForeignKey("personality_dimensions.id", ondelete="SET NULL"))
    category_id = Column(UUID(as_uuid=True), ForeignKey("question_categories.id", ondelete="SET NULL"))
    embedding_generated = Column(Boolean, default=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())


# Removed - replaced by personality_traits table


class UserDailyProgress(Base):
    __tablename__ = "user_daily_progress"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), unique=True, nullable=False)
    current_day = Column(Integer, default=1)
    total_responses = Column(Integer, default=0)
    streak_days = Column(Integer, default=0)
    last_response_date = Column(DateTime(timezone=True))
    started_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())


class AIConversation(Base):
    __tablename__ = "ai_conversations"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    ai_id = Column(UUID(as_uuid=True), ForeignKey("archetypal_ais.id", ondelete="CASCADE"), nullable=False)
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


class AITask(Base):
    __tablename__ = "ai_tasks"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    ai_id = Column(UUID(as_uuid=True), ForeignKey("archetypal_ais.id", ondelete="CASCADE"), nullable=False)
    task_name = Column(String, nullable=False)
    description = Column(Text, nullable=False)
    frequency = Column(String, default="on_demand")
    is_active = Column(Boolean, default=True)
    last_executed = Column(DateTime(timezone=True))
    created_at = Column(DateTime(timezone=True), server_default=func.now())


# New models for multi-layer personality system

class PersonalityDimension(Base):
    __tablename__ = "personality_dimensions"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    dimension_name = Column(Text, nullable=False, unique=True)
    display_name = Column(Text, nullable=False)
    description = Column(Text)
    parent_dimension_id = Column(UUID(as_uuid=True), ForeignKey("personality_dimensions.id", ondelete="CASCADE"))
    depth_level = Column(Integer, nullable=False, default=0)
    dimension_order = Column(Integer, nullable=False, default=0)
    affects_task_types = Column(ARRAY(Text), default=list)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())


class PersonalityTrait(Base):
    __tablename__ = "personality_traits"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    ai_id = Column(UUID(as_uuid=True), ForeignKey("archetypal_ais.id", ondelete="CASCADE"), nullable=False)
    dimension_id = Column(UUID(as_uuid=True), ForeignKey("personality_dimensions.id", ondelete="CASCADE"), nullable=False)
    trait_name = Column(Text, nullable=False)
    trait_value = Column(Text, nullable=False)
    confidence_score = Column(Float, default=0.0)
    supporting_responses = Column(ARRAY(UUID(as_uuid=True)), default=list)
    extracted_at = Column(DateTime(timezone=True), server_default=func.now())
    last_updated = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
    is_verified = Column(Boolean, default=False)


class QuestionCategory(Base):
    __tablename__ = "question_categories"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    category_name = Column(Text, nullable=False, unique=True)
    display_name = Column(Text, nullable=False)
    description = Column(Text)
    dimension_id = Column(UUID(as_uuid=True), ForeignKey("personality_dimensions.id", ondelete="SET NULL"))
    parent_category_id = Column(UUID(as_uuid=True), ForeignKey("question_categories.id", ondelete="CASCADE"))
    question_count = Column(Integer, default=0)
    depth_level = Column(Integer, default=0)
    category_order = Column(Integer, default=0)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())


class DailyQuestionPool(Base):
    __tablename__ = "daily_question_pool"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    question_text = Column(Text, nullable=False)
    category_id = Column(UUID(as_uuid=True), ForeignKey("question_categories.id", ondelete="SET NULL"))
    dimension_id = Column(UUID(as_uuid=True), ForeignKey("personality_dimensions.id", ondelete="SET NULL"))
    difficulty_level = Column(Integer, default=1)
    requires_deep_thought = Column(Boolean, default=False)
    follow_up_questions = Column(ARRAY(Text), default=list)
    day_range_start = Column(Integer, default=1)
    day_range_end = Column(Integer, default=365)
    is_active = Column(Boolean, default=True)
    usage_count = Column(Integer, default=0)
    created_at = Column(DateTime(timezone=True), server_default=func.now())


# Family member invitations - for future implementation with actual family members table
# Current schema uses family_members table differently


# External responses - for future implementation


class TraitTaskAssociation(Base):
    __tablename__ = "trait_task_associations"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    trait_id = Column(UUID(as_uuid=True), ForeignKey("personality_traits.id", ondelete="CASCADE"), nullable=False)
    task_type = Column(Text, nullable=False)
    relevance_score = Column(Float, default=0.5)
    affects_execution = Column(Boolean, default=True)
    execution_modifier = Column(JSON, default=dict)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
