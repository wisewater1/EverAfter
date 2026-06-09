import uuid
from datetime import datetime
from sqlalchemy import Column, String, DateTime, Boolean, JSON, Integer
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.db.session import Base

def generate_cuid():
    # Simple mock fallback for Prisma cuid
    return f"c{uuid.uuid4().hex[:24]}"

class AuditLog(Base):
    __tablename__ = "audit_logs"

    id = Column(String, primary_key=True, default=generate_cuid)
    userId = Column(String, nullable=True)
    action = Column(String, nullable=False)
    provider = Column(String, nullable=True)
    snapshotId = Column(String, nullable=True)
    consentId = Column(String, nullable=True)
    sha256 = Column(String, nullable=True)
    metadata_ = Column("metadata", JSON, nullable=True)
    ts = Column(DateTime, default=func.now(), nullable=False)
    
    # Cryptographic fields
    prevHash = Column(String, nullable=True)
    signature = Column(String, nullable=True)
    signerId = Column(String, nullable=True)


class ComplianceControl(Base):
    __tablename__ = "compliance_controls"

    id = Column(String, primary_key=True, default=generate_cuid)
    controlId = Column(String, unique=True, nullable=False)
    description = Column(String, nullable=False)
    isPassing = Column(Boolean, default=True, nullable=False)
    lastCheckedAt = Column(DateTime, default=func.now(), nullable=False)
    metadata_ = Column("metadata", JSON, nullable=True)


class JITAccessRequest(Base):
    __tablename__ = "jit_access_requests"

    id = Column(String, primary_key=True, default=generate_cuid)
    userId = Column(String, nullable=False)
    targetResource = Column(String, nullable=False)
    reason = Column(String, nullable=False)
    status = Column(String, default="PENDING", nullable=False)
    expiresAt = Column(DateTime, nullable=False)
    createdAt = Column(DateTime, default=func.now(), nullable=False)
    approvedBy = Column(String, nullable=True)
    approvedAt = Column(DateTime, nullable=True)


class RestoreDrill(Base):
    __tablename__ = "restore_drills"

    id = Column(String, primary_key=True, default=generate_cuid)
    targetResource = Column(String, nullable=False)
    status = Column(String, nullable=False)
    durationMs = Column(Integer, nullable=True)
    proofHash = Column(String, nullable=True)
    createdAt = Column(DateTime, default=func.now(), nullable=False)
