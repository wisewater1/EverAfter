"""
Pydantic schemas for the Media Intelligence pipeline.
Defines models for file uploads, extracted insights, info stacks,
and permission management per family member.
"""
from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any
from datetime import datetime
from enum import Enum


class MediaType(str, Enum):
    IMAGE = "image"
    VIDEO = "video"
    TEXT = "text"
    DOCUMENT = "document"


class InsightCategory(str, Enum):
    TRAIT = "trait"
    DATE = "date"
    OCCUPATION = "occupation"
    HEALTH = "health"
    MILESTONE = "milestone"
    RELATIONSHIP = "relationship"
    LOCATION = "location"
    INTEREST = "interest"
    QUOTE = "quote"
    APPEARANCE = "appearance"
    OTHER = "other"


class ExtractedInsight(BaseModel):
    """A single piece of information extracted by AI from media."""
    id: str = ""
    category: InsightCategory
    label: str = ""  # short human-readable label
    value: str  # the actual insight text
    confidence: float = Field(0.5, ge=0, le=1)
    source_snippet: str = ""  # where in the source this came from
    source_media_type: MediaType = MediaType.TEXT
    approved: bool = False  # must be approved by user before committing


class ExtractionResult(BaseModel):
    """Full extraction result for one media upload."""
    member_id: str
    member_name: str = ""
    media_type: MediaType
    raw_summary: str = ""  # AI narrative summary of the media
    insights: List[ExtractedInsight] = []
    extracted_at: datetime = Field(default_factory=datetime.utcnow)


class InfoStackEntry(BaseModel):
    """One editable piece of information in a member's info stack."""
    id: str = ""
    category: InsightCategory = InsightCategory.OTHER
    label: str = ""
    value: str = ""
    source: str = "manual"  # "ai_extracted" | "manual" | "imported"
    confidence: float = Field(1.0, ge=0, le=1)
    created_at: str = ""
    updated_at: str = ""
    locked: bool = False  # user can lock entries to prevent AI overwrite


class InfoStackUpdateRequest(BaseModel):
    """Request to edit the info stack."""
    entries: List[InfoStackEntry] = []
    deleted_ids: List[str] = []


class MediaPermissions(BaseModel):
    """Per-member AI processing permissions."""
    member_id: str
    allow_ai_processing: bool = False
    allow_image_analysis: bool = False
    allow_video_analysis: bool = False
    allow_text_analysis: bool = False
    granted_at: Optional[str] = None
    granted_by: str = ""


class PermissionsUpdateRequest(BaseModel):
    member_id: str
    allow_ai_processing: bool
    allow_image_analysis: bool = True
    allow_video_analysis: bool = True
    allow_text_analysis: bool = True


class MediaUploadRequest(BaseModel):
    member_id: str
    media_type: MediaType
    filename: str = ""
    content: str = ""  # base64-encoded for binary, raw for text
    permissions_granted: bool = False
