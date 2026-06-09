from sqlalchemy import Column, String, Boolean, DateTime, ForeignKey, Text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.sql import func
import uuid
from app.db.session import Base

class TimeCapsule(Base):
    __tablename__ = "time_capsules"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), index=True, nullable=False)
    
    sender_saint_id = Column(String, nullable=False) # "joseph", "michael", or dynamic ID
    recipient_email = Column(String, nullable=True) # If intended for external
    
    title = Column(String, nullable=False)
    content = Column(Text, nullable=False)
    media_url = Column(String, nullable=True)
    
    unlock_date = Column(DateTime(timezone=True), nullable=True)
    unlock_condition = Column(String, nullable=True) # event name like "life_milestone"
    
    is_unlocked = Column(Boolean, default=False)
    is_read = Column(Boolean, default=False)
    
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    unlocked_at = Column(DateTime(timezone=True), nullable=True)
