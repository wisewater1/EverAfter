"""
St. Gabriel Finance Models

Models for the Envelope Budgeting system.
"""

from sqlalchemy import Column, String, Float, DateTime, ForeignKey, Boolean, Date, Integer, Text
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
    ledger_entries = relationship("WiseGoldLedgerEntry", back_populates="wallet")


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
    ledger_entries = relationship("WiseGoldLedgerEntry", back_populates="covenant")


class WiseGoldLedgerEntry(Base):
    """Auditable ledger for all WGOLD movements and covenant actions."""
    __tablename__ = "wisegold_ledger_entries"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(String, nullable=False, index=True)
    wallet_id = Column(UUID(as_uuid=True), ForeignKey("wisegold_wallets.id"), nullable=True, index=True)
    covenant_id = Column(UUID(as_uuid=True), ForeignKey("wisegold_covenants.id"), nullable=True, index=True)
    entry_type = Column(String, nullable=False, index=True)
    direction = Column(String, nullable=False, default="credit")  # credit, debit, info
    amount = Column(Float, nullable=False, default=0.0)
    balance_after = Column(Float, nullable=True)
    status = Column(String, nullable=False, default="COMPLETED")  # COMPLETED, PENDING_QUORUM, FAILED
    description = Column(String, nullable=False)
    metadata_json = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, index=True)

    wallet = relationship("WiseGoldWallet", back_populates="ledger_entries")
    covenant = relationship("SovereignCovenant", back_populates="ledger_entries")


class WiseGoldPolicyState(Base):
    """Persisted global policy state for the Sovereign 3.0 engine."""
    __tablename__ = "wisegold_policy_state"

    id = Column(Integer, primary_key=True, default=1)
    current_tax_rate = Column(Float, default=0.005)
    current_base_manna = Column(Float, default=0.5)
    daily_manna_pool = Column(Float, default=35762.61)
    total_circulating = Column(Float, default=1045260.91)
    last_gold_price = Column(Float, default=72.0)
    stress_level = Column(Float, default=0.0)
    last_tick_velocity = Column(Float, default=0.0)
    last_gold_delta = Column(Float, default=0.0)
    last_tick_at = Column(DateTime, nullable=True)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)


class WiseGoldSocialStanding(Base):
    """Persisted social standing snapshot used for WGOLD reputation and emissions."""
    __tablename__ = "wisegold_social_standings"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(String, nullable=False, unique=True, index=True)
    reputation_bps = Column(Integer, default=5000)
    normalized_score = Column(Float, default=0.5)
    daily_manna_multiplier_bps = Column(Integer, default=10000)
    governance_weight_bps = Column(Integer, default=10000)
    total_interactions = Column(Integer, default=0)
    distinct_peers = Column(Integer, default=0)
    reciprocal_peers = Column(Integer, default=0)
    inbound_sentiment_avg = Column(Float, default=0.5)
    inbound_rapport_avg = Column(Float, default=0.5)
    outbound_sentiment_avg = Column(Float, default=0.5)
    last_calculated_at = Column(DateTime, default=datetime.utcnow)
    last_synced_onchain_at = Column(DateTime, nullable=True)
    last_synced_wallet_address = Column(String, nullable=True)

