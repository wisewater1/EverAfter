from sqlalchemy import Column, String, Integer, Boolean, DateTime, Text, ARRAY, Float, JSON, ForeignKey, BigInteger
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.sql import func
from app.db.session import Base
import uuid


class AgentCredential(Base):
    __tablename__ = "agent_credentials"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), nullable=False)
    engram_id = Column(UUID(as_uuid=True), ForeignKey("engrams.id", ondelete="CASCADE"))
    credential_type = Column(String, nullable=False)
    service_name = Column(String, nullable=False)
    username = Column(String)
    encrypted_password = Column(Text)
    additional_data = Column(JSON, default=dict)
    is_verified = Column(Boolean, default=False)
    last_used_at = Column(DateTime(timezone=True))
    expires_at = Column(DateTime(timezone=True))
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())


class AgentTaskQueue(Base):
    __tablename__ = "agent_task_queue"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    engram_id = Column(UUID(as_uuid=True), ForeignKey("engrams.id", ondelete="CASCADE"), nullable=False)
    user_id = Column(UUID(as_uuid=True), nullable=False)
    task_type = Column(String, nullable=False)
    task_title = Column(Text, nullable=False)
    task_description = Column(Text, nullable=False)
    priority = Column(String, default='medium')

    # Execution details
    status = Column(String, default='pending')
    scheduled_for = Column(DateTime(timezone=True), server_default=func.now())
    retry_count = Column(Integer, default=0)
    max_retries = Column(Integer, default=3)

    # Task configuration
    requires_credentials = Column(Boolean, default=False)
    credential_ids = Column(ARRAY(UUID(as_uuid=True)), default=list)
    execution_config = Column(JSON, default=dict)

    # Results
    result = Column(JSON)
    error_message = Column(Text)
    completion_percentage = Column(Integer, default=0)

    # Timestamps
    started_at = Column(DateTime(timezone=True))
    completed_at = Column(DateTime(timezone=True))
    last_retry_at = Column(DateTime(timezone=True))
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())


class AgentTaskExecution(Base):
    __tablename__ = "agent_task_executions"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    task_id = Column(UUID(as_uuid=True), ForeignKey("agent_task_queue.id", ondelete="CASCADE"), nullable=False)
    execution_step = Column(Text, nullable=False)
    step_order = Column(Integer, nullable=False)
    status = Column(String, nullable=False)
    step_description = Column(Text)
    step_result = Column(JSON)
    error_details = Column(Text)
    duration_ms = Column(BigInteger)
    ai_reasoning = Column(Text)
    started_at = Column(DateTime(timezone=True), server_default=func.now())
    completed_at = Column(DateTime(timezone=True))


class AgentNotification(Base):
    __tablename__ = "agent_notifications"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), nullable=False)
    engram_id = Column(UUID(as_uuid=True), ForeignKey("engrams.id", ondelete="CASCADE"))
    task_id = Column(UUID(as_uuid=True), ForeignKey("agent_task_queue.id", ondelete="SET NULL"))

    notification_type = Column(String, nullable=False)
    title = Column(Text, nullable=False)
    message = Column(Text, nullable=False)
    priority = Column(String, default='normal')

    # Notification state
    is_read = Column(Boolean, default=False)
    is_actionable = Column(Boolean, default=False)
    action_url = Column(String)
    action_taken = Column(Boolean, default=False)

    # Health-specific fields
    health_category = Column(String)
    related_appointment_date = Column(DateTime(timezone=True))
    medication_name = Column(String)

    # Metadata
    metadata = Column(JSON, default=dict)

    read_at = Column(DateTime(timezone=True))
    created_at = Column(DateTime(timezone=True), server_default=func.now())


class AgentEmailLog(Base):
    __tablename__ = "agent_email_logs"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    task_id = Column(UUID(as_uuid=True), ForeignKey("agent_task_queue.id", ondelete="SET NULL"))
    user_id = Column(UUID(as_uuid=True), nullable=False)
    engram_id = Column(UUID(as_uuid=True), ForeignKey("engrams.id", ondelete="SET NULL"))

    # Email details
    to_addresses = Column(ARRAY(String), nullable=False)
    cc_addresses = Column(ARRAY(String), default=list)
    subject = Column(Text, nullable=False)
    body_text = Column(Text, nullable=False)
    body_html = Column(Text)

    # Sending details
    status = Column(String, default='pending')
    provider = Column(String, default='sendgrid')
    provider_message_id = Column(String)

    # Context
    email_purpose = Column(Text)
    is_automated = Column(Boolean, default=True)
    requires_approval = Column(Boolean, default=True)
    approved_by = Column(UUID(as_uuid=True))
    approved_at = Column(DateTime(timezone=True))

    sent_at = Column(DateTime(timezone=True))
    failed_at = Column(DateTime(timezone=True))
    error_message = Column(Text)
    created_at = Column(DateTime(timezone=True), server_default=func.now())


class CredentialRequest(Base):
    __tablename__ = "credential_requests"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    task_id = Column(UUID(as_uuid=True), ForeignKey("agent_task_queue.id", ondelete="CASCADE"), nullable=False)
    user_id = Column(UUID(as_uuid=True), nullable=False)
    engram_id = Column(UUID(as_uuid=True), ForeignKey("engrams.id", ondelete="SET NULL"))

    credential_type = Column(String, nullable=False)
    service_name = Column(String, nullable=False)
    purpose = Column(Text, nullable=False)
    ai_reasoning = Column(Text)

    status = Column(String, default='pending')

    # Provided credentials (encrypted)
    provided_username = Column(Text)
    provided_password_encrypted = Column(Text)
    additional_info = Column(JSON, default=dict)

    responded_at = Column(DateTime(timezone=True))
    expires_at = Column(DateTime(timezone=True))
    created_at = Column(DateTime(timezone=True), server_default=func.now())


class HealthTaskTemplate(Base):
    __tablename__ = "health_task_templates"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    template_name = Column(String, nullable=False, unique=True)
    task_type = Column(String, nullable=False)
    display_name = Column(Text, nullable=False)
    description = Column(Text)
    required_credentials = Column(ARRAY(String))
    default_priority = Column(String, default='medium')
    execution_steps = Column(JSON, nullable=False)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
