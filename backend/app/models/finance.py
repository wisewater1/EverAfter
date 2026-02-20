"""
St. Gabriel Finance Models

Models for the Envelope Budgeting system.
"""

from sqlalchemy import Column, String, Float, DateTime, ForeignKey, Boolean, Date, Integer
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from app.db.session import Base
import uuid
from datetime import datetime

class BudgetCategory(Base):
    __tablename__ = "budget_categories"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(String, nullable=False, index=True)  # Auth0 ID
    name = Column(String, nullable=False)
    group = Column(String, nullable=False)  # e.g., "Living Expenses", "Savings"
    is_hidden = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.utcnow)

    # Relationships
    envelopes = relationship("BudgetEnvelope", back_populates="category", cascade="all, delete-orphan")
    transactions = relationship("Transaction", back_populates="category")


class BudgetEnvelope(Base):
    __tablename__ = "budget_envelopes"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    category_id = Column(UUID(as_uuid=True), ForeignKey("budget_categories.id"), nullable=False)
    month = Column(String, nullable=False, index=True)  # Format: "YYYY-MM"
    assigned = Column(Float, default=0.0)
    note = Column(String, nullable=True)

    # Relationships
    category = relationship("BudgetCategory", back_populates="envelopes")


class Transaction(Base):
    __tablename__ = "finance_transactions"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(String, nullable=False, index=True)
    date = Column(Date, nullable=False)
    payee = Column(String, nullable=False)
    amount = Column(Float, nullable=False)  # Negative for outflow, Positive for inflow
    category_id = Column(UUID(as_uuid=True), ForeignKey("budget_categories.id"), nullable=True)
    description = Column(String, nullable=True)
    is_cleared = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.utcnow)

    # Relationships
    category = relationship("BudgetCategory", back_populates="transactions")
