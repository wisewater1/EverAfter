import uuid
from datetime import datetime
from sqlalchemy import Column, String, DateTime, Boolean, JSON, Integer
from sqlalchemy.sql import func
from app.db.session import Base

def generate_cuid():
    return f"c{uuid.uuid4().hex[:24]}"

class FamilyTask(Base):
    __tablename__ = "family_tasks"

    id = Column(String, primary_key=True, default=generate_cuid)
    text = Column(String, nullable=False)
    description = Column(String, nullable=True)
    task_type = Column(String, default="standard", nullable=False)
    status = Column(String, default="pending", nullable=False)
    completed = Column(Boolean, default=False, nullable=False)
    assigned_to = Column(String, nullable=True) # Could be user ID or name
    reward_wg = Column(Integer, nullable=True)
    ai_brief = Column(String, nullable=True)
    metadata_json = Column(JSON, nullable=True)
    due_date = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=func.now(), nullable=False)
    user_id = Column(String, nullable=True)

class ShoppingItem(Base):
    __tablename__ = "shopping_items"

    id = Column(String, primary_key=True, default=generate_cuid)
    text = Column(String, nullable=False)
    item_type = Column(String, default="standard", nullable=False)
    status = Column(String, default="needed", nullable=False)
    bought = Column(Boolean, default=False, nullable=False)
    quantity = Column(String, nullable=True)
    price_est = Column(Integer, nullable=True)
    trigger_source = Column(String, nullable=True)
    legacy_beneficiary = Column(String, nullable=True)
    unlock_year = Column(Integer, nullable=True)
    metadata_json = Column(JSON, nullable=True)
    created_at = Column(DateTime, default=func.now(), nullable=False)
    user_id = Column(String, nullable=True)

class CalendarEvent(Base):
    __tablename__ = "calendar_events"

    id = Column(String, primary_key=True, default=generate_cuid)
    title = Column(String, nullable=False)
    date = Column(String, nullable=False) # e.g., YYYY-MM-DD
    time = Column(String, nullable=True)  # e.g., HH:MM
    attendees = Column(JSON, nullable=True) # list of names or IDs
    created_at = Column(DateTime, default=func.now(), nullable=False)
    user_id = Column(String, nullable=True)

class BulletinMessage(Base):
    __tablename__ = "bulletin_messages"

    id = Column(String, primary_key=True, default=generate_cuid)
    text = Column(String, nullable=False)
    author = Column(String, nullable=False)
    created_at = Column(DateTime, default=func.now(), nullable=False)
    user_id = Column(String, nullable=True)
