import uuid
from datetime import datetime
from sqlalchemy import Column, String, DateTime, JSON, ForeignKey
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.db.session import Base

def generate_cuid():
    return f"c{uuid.uuid4().hex[:24]}"

class FamilyNode(Base):
    __tablename__ = "family_nodes"

    id = Column(String, primary_key=True, default=generate_cuid)
    user_id = Column(String, nullable=False)
    name = Column(String, nullable=False)
    gender = Column(String, nullable=True) # M, F, O
    birth_date = Column(String, nullable=True) # YYYY-MM-DD
    death_date = Column(String, nullable=True)
    health_metrics = Column(JSON, nullable=True) 
    created_at = Column(DateTime, default=func.now(), nullable=False)

class FamilyRelationship(Base):
    __tablename__ = "family_relationships"

    id = Column(String, primary_key=True, default=generate_cuid)
    from_node_id = Column(String, ForeignKey("family_nodes.id", ondelete="CASCADE"), nullable=False)
    to_node_id = Column(String, ForeignKey("family_nodes.id", ondelete="CASCADE"), nullable=False)
    relation_type = Column(String, nullable=False) # e.g., 'parent', 'child', 'spouse', 'sibling'
    created_at = Column(DateTime, default=func.now(), nullable=False)

class FamilyEvent(Base):
    __tablename__ = "family_events"

    id = Column(String, primary_key=True, default=generate_cuid)
    user_id = Column(String, nullable=False)
    member_id = Column(String, nullable=False)
    member_name = Column(String, nullable=False)
    type = Column(String, nullable=False) # 'birth', 'marriage', 'death', 'milestone', 'adoption'
    date = Column(String, nullable=False) # YYYY-MM-DD
    title = Column(String, nullable=False)
    description = Column(String, nullable=True)
    media_url = Column(String, nullable=True)
    created_at = Column(DateTime, default=func.now(), nullable=False)

