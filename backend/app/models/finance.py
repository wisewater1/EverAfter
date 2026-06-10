"""
St. Gabriel Finance Models

Models for the Envelope Budgeting system.
"""

import uuid
from datetime import datetime

from sqlalchemy import Boolean, Column, Date, DateTime, Float, ForeignKey, Integer, String, Text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship

from app.db.session import Base


class BudgetCategory(Base):
    __tablename__ = "budget_categories"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(String, nullable=False, index=True)
    name = Column(String, nullable=False)
    group = Column(String, nullable=False)
    is_hidden = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.utcnow)

    envelopes = relationship("BudgetEnvelope", back_populates="category", cascade="all, delete-orphan")
    transactions = relationship("Transaction", back_populates="category")


class BudgetEnvelope(Base):
    __tablename__ = "budget_envelopes"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    category_id = Column(UUID(as_uuid=True), ForeignKey("budget_categories.id"), nullable=False)
    month = Column(String, nullable=False, index=True)
    assigned = Column(Float, default=0.0)
    note = Column(String, nullable=True)

    category = relationship("BudgetCategory", back_populates="envelopes")


class Transaction(Base):
    __tablename__ = "finance_transactions"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(String, nullable=False, index=True)
    date = Column(Date, nullable=False)
    payee = Column(String, nullable=False)
    amount = Column(Float, nullable=False)  # Negative for outflow, positive for inflow
    category_id = Column(UUID(as_uuid=True), ForeignKey("budget_categories.id"), nullable=True)
    description = Column(String, nullable=True)
    is_cleared = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.utcnow)

    category = relationship("BudgetCategory", back_populates="transactions")
    imported_record = relationship("BankImportedTransaction", back_populates="transaction", uselist=False)


class BankConnection(Base):
    __tablename__ = "bank_connections"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(String, nullable=False, index=True)
    provider = Column(String, nullable=False, default="plaid", index=True)
    item_id = Column(String, nullable=False, unique=True, index=True)
    institution_id = Column(String, nullable=True)
    institution_name = Column(String, nullable=True)
    access_token_encrypted = Column(Text, nullable=False)
    sync_cursor = Column(Text, nullable=True)
    status = Column(String, nullable=False, default="ACTIVE", index=True)
    last_synced_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    accounts = relationship("BankAccount", back_populates="connection", cascade="all, delete-orphan")
    imported_transactions = relationship("BankImportedTransaction", back_populates="connection")


class BankAccount(Base):
    __tablename__ = "bank_accounts"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    connection_id = Column(UUID(as_uuid=True), ForeignKey("bank_connections.id"), nullable=False, index=True)
    provider_account_id = Column(String, nullable=False, unique=True, index=True)
    name = Column(String, nullable=False)
    official_name = Column(String, nullable=True)
    mask = Column(String, nullable=True)
    type = Column(String, nullable=True)
    subtype = Column(String, nullable=True)
    iso_currency_code = Column(String, nullable=True)
    current_balance = Column(Float, nullable=True)
    available_balance = Column(Float, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    connection = relationship("BankConnection", back_populates="accounts")
    imported_transactions = relationship("BankImportedTransaction", back_populates="bank_account")


class BankImportedTransaction(Base):
    __tablename__ = "bank_imported_transactions"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(String, nullable=False, index=True)
    connection_id = Column(UUID(as_uuid=True), ForeignKey("bank_connections.id"), nullable=False, index=True)
    bank_account_id = Column(UUID(as_uuid=True), ForeignKey("bank_accounts.id"), nullable=True, index=True)
    finance_transaction_id = Column(UUID(as_uuid=True), ForeignKey("finance_transactions.id"), nullable=True, unique=True)
    provider = Column(String, nullable=False, default="plaid", index=True)
    provider_transaction_id = Column(String, nullable=False, unique=True, index=True)
    pending = Column(Boolean, default=False)
    raw_json = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    connection = relationship("BankConnection", back_populates="imported_transactions")
    bank_account = relationship("BankAccount", back_populates="imported_transactions")
    transaction = relationship("Transaction", back_populates="imported_record")


# WiseGold Sovereign 3.0 Models


class WiseGoldWallet(Base):
    __tablename__ = "wisegold_wallets"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(String, nullable=False, index=True, unique=True)
    solana_pubkey = Column(String, nullable=True)
    balance = Column(Float, default=0.0)
    last_manna_claim = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    ritual_bond = relationship("RitualBondNFT", back_populates="wallet", uselist=False, cascade="all, delete-orphan")
    living_will = relationship("LivingWill", back_populates="wallet", uselist=False, cascade="all, delete-orphan")
    ledger_entries = relationship("WiseGoldLedgerEntry", back_populates="wallet")


class RitualBondNFT(Base):
    __tablename__ = "wisegold_ritual_bonds"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    wallet_id = Column(UUID(as_uuid=True), ForeignKey("wisegold_wallets.id"), nullable=False, unique=True)
    tier = Column(String, default="Seed")
    ritual_score = Column(Float, default=0.0)
    multiplier = Column(Float, default=1.0)
    last_ritual_at = Column(DateTime, default=datetime.utcnow)

    wallet = relationship("WiseGoldWallet", back_populates="ritual_bond")


class LivingWill(Base):
    __tablename__ = "wisegold_living_wills"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    wallet_id = Column(UUID(as_uuid=True), ForeignKey("wisegold_wallets.id"), nullable=False, unique=True)
    status = Column(String, default="ACTIVE")
    last_heartbeat = Column(DateTime, default=datetime.utcnow)
    heirs = Column(String, nullable=True)

    wallet = relationship("WiseGoldWallet", back_populates="living_will")


class SovereignCovenant(Base):
    __tablename__ = "wisegold_covenants"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name = Column(String, nullable=False)
    total_vault = Column(Float, default=0.0)
    members = Column(String, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    ledger_entries = relationship("WiseGoldLedgerEntry", back_populates="covenant")


class WiseGoldLedgerEntry(Base):
    __tablename__ = "wisegold_ledger_entries"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(String, nullable=False, index=True)
    wallet_id = Column(UUID(as_uuid=True), ForeignKey("wisegold_wallets.id"), nullable=True, index=True)
    covenant_id = Column(UUID(as_uuid=True), ForeignKey("wisegold_covenants.id"), nullable=True, index=True)
    entry_type = Column(String, nullable=False, index=True)
    direction = Column(String, nullable=False, default="credit")
    amount = Column(Float, nullable=False, default=0.0)
    balance_after = Column(Float, nullable=True)
    status = Column(String, nullable=False, default="COMPLETED")
    description = Column(String, nullable=False)
    metadata_json = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, index=True)

    wallet = relationship("WiseGoldWallet", back_populates="ledger_entries")
    covenant = relationship("SovereignCovenant", back_populates="ledger_entries")


class WiseGoldPolicyState(Base):
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


class WiseGoldCovenantAttestation(Base):
    __tablename__ = "wisegold_covenant_attestations"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(String, nullable=False, index=True)
    covenant_id = Column(UUID(as_uuid=True), ForeignKey("wisegold_covenants.id"), nullable=False, index=True)
    wallet_address = Column(String, nullable=True, index=True)
    attestation_type = Column(String, nullable=False, default="BACKEND_COVENANT_MEMBERSHIP")
    status = Column(String, nullable=False, default="ACTIVE", index=True)
    covenant_key = Column(String, nullable=False, index=True)
    proof_reference = Column(String, nullable=True)
    metadata_json = Column(Text, nullable=True)
    issued_by = Column(String, nullable=False, default="everafter_backend")
    issued_at = Column(DateTime, default=datetime.utcnow)
    expires_at = Column(DateTime, nullable=True)
    last_verified_at = Column(DateTime, default=datetime.utcnow)

    covenant = relationship("SovereignCovenant")
