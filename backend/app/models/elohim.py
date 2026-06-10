"""Elohim anchor records — which EverAfter rows are sealed in the ledger.

The anchor worker (``app.workers.elohim_anchor``) writes one row per sealed
artifact so the web API (and the St Joseph UI) can show permanence status
without touching the ledger files on the worker's disk.
"""

from sqlalchemy import Column, DateTime, String
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.sql import func

from app.db.session import Base


class ElohimAnchor(Base):
    __tablename__ = "elohim_anchors"

    # What got sealed: 'soul' (Engram), 'memory' (EngramDailyResponse),
    # or 'bond' (FamilyRelationship). (ref_type, ref_id) is the identity.
    ref_type = Column(String, primary_key=True)
    ref_id = Column(String, primary_key=True)
    user_id = Column(UUID(as_uuid=True), nullable=False, index=True)
    # The Elohim sigil of the soul this artifact lives under.
    sigil = Column(String, nullable=False)
    sealed_at = Column(DateTime(timezone=True), server_default=func.now())
