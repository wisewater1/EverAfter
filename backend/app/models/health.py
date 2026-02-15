from sqlalchemy import Column, String, Float, DateTime, JSON, ForeignKey, Enum as SQLEnum
from sqlalchemy.dialects.postgresql import UUID
from app.db.session import Base
import enum

class MetricType(str, enum.Enum):
    HEART_RATE = "HEART_RATE"
    STEPS = "STEPS"
    CALORIES = "CALORIES"
    HRV = "HRV"
    OXYGEN_SAT = "OXYGEN_SAT"
    RESPIRATION = "RESPIRATION"
    TEMP = "TEMP"
    SLEEP_DURATION = "SLEEP_DURATION"
    SLEEP_STAGE = "SLEEP_STAGE"
    GLUCOSE = "GLUCOSE"
    BLOOD_PRESSURE = "BLOOD_PRESSURE"
    WEIGHT = "WEIGHT"
    ACTIVITY = "ACTIVITY"
    DISTANCE = "DISTANCE"

class Metric(Base):
    __tablename__ = "metrics"

    id = Column(String, primary_key=True)
    sourceId = Column(String, nullable=False, index=True)
    deviceId = Column(String)
    type = Column(String, nullable=False, index=True)
    ts = Column(DateTime(timezone=True), nullable=False, index=True)
    value = Column(Float)
    unit = Column(String)
    payload = Column(JSON, nullable=False)

class Source(Base):
    __tablename__ = "sources"

    id = Column(String, primary_key=True)
    userId = Column(String, nullable=False, index=True)
    provider = Column(String, nullable=False)
    externalUserId = Column(String)
    accessToken = Column(String)
    refreshToken = Column(String)
    expiresAt = Column(DateTime(timezone=True))
    connectedAt = Column(DateTime(timezone=True))
    lastSyncAt = Column(DateTime(timezone=True))

class Device(Base):
    __tablename__ = "devices"

    id = Column(String, primary_key=True)
    sourceId = Column(String, ForeignKey("sources.id"), nullable=False)
    providerDeviceId = Column(String)
    name = Column(String)
    model = Column(String)
    manufacturer = Column(String)
