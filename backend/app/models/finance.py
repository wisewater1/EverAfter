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

# ══════════════════════════════════════════════════════════════════════════════
# WiseGold Sovereign 3.0 Models
# ══════════════════════════════════════════════════════════════════════════════

class WiseGoldWallet(Base):
    """Stores the WGOLD balance and Manna distribution logic"""
    __tablename__ = "wisegold_wallets"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(String, nullable=False, index=True, unique=True)
    solana_pubkey = Column(String, nullable=True)
    balance = Column(Float, default=0.0)
    last_manna_claim = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    # Relationships
    ritual_bond = relationship("RitualBondNFT", back_populates="wallet", uselist=False, cascade="all, delete-orphan")
    living_will = relationship("LivingWill", back_populates="wallet", uselist=False, cascade="all, delete-orphan")


class RitualBondNFT(Base):
    """Soulbound NFT that tracks behavioral multipliers"""
    __tablename__ = "wisegold_ritual_bonds"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    wallet_id = Column(UUID(as_uuid=True), ForeignKey("wisegold_wallets.id"), nullable=False, unique=True)
    tier = Column(String, default="Seed")  # Seed, Bronze, Gold, Diamond
    ritual_score = Column(Float, default=0.0)  # 0.0 to 1.0
    multiplier = Column(Float, default=1.0)
    last_ritual_at = Column(DateTime, default=datetime.utcnow)
    
    # Relationships
    wallet = relationship("WiseGoldWallet", back_populates="ritual_bond")


class LivingWill(Base):
    """Tracks Proof-of-Life and automates inheritance/redistribution"""
    __tablename__ = "wisegold_living_wills"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    wallet_id = Column(UUID(as_uuid=True), ForeignKey("wisegold_wallets.id"), nullable=False, unique=True)
    status = Column(String, default="ACTIVE") # ACTIVE, FREEZE, PARTIAL_RELEASE, HISTORICAL
    last_heartbeat = Column(DateTime, default=datetime.utcnow)
    heirs = Column(String, nullable=True) # JSON serialized list of heir IDs and shares

    # Relationships
    wallet = relationship("WiseGoldWallet", back_populates="living_will")


class SovereignCovenant(Base):
    """Group vaults requiring biometric quorum"""
    __tablename__ = "wisegold_covenants"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name = Column(String, nullable=False)
    total_vault = Column(Float, default=0.0)
    members = Column(String, nullable=False) # JSON serialized list of member IDs and specific covenant data
    created_at = Column(DateTime, default=datetime.utcnow)

