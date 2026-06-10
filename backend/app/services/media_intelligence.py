"""
MediaIntelligenceService — AI extraction engine for family member media.

Analyzes text, images, and video to extract structured insights
(traits, dates, occupations, milestones, health indicators, relationships)
that are added to each family member's editable information stack.

All processing is gated by per-member permissions.
"""

from __future__ import annotations

import uuid
import re
import base64
from typing import Dict, Any, List, Optional
from datetime import datetime


# ── Keyword lexicons for text extraction ─────────────────────────

TRAIT_KEYWORDS = {
    "compassionate": "trait", "caring": "trait", "brave": "trait",
    "resilient": "trait", "creative": "trait", "disciplined": "trait",
    "patient": "trait", "generous": "trait", "stubborn": "trait",
    "ambitious": "trait", "shy": "trait", "outgoing": "trait",
    "intelligent": "trait", "witty": "trait", "loyal": "trait",
    "adventurous": "trait", "nurturing": "trait", "analytical": "trait",
    "kind": "trait", "wise": "trait", "humble": "trait",
    "determined": "trait", "thoughtful": "trait", "energetic": "trait",
    "athletic": "trait", "artistic": "trait", "musical": "trait",
}

OCCUPATION_KEYWORDS = [
    "teacher", "nurse", "doctor", "engineer", "architect", "lawyer",
    "chef", "firefighter", "police", "military", "soldier", "pilot",
    "farmer", "artist", "musician", "writer", "professor", "scientist",
    "mechanic", "electrician", "plumber", "carpenter", "accountant",
    "manager", "director", "coach", "counselor", "therapist", "surgeon",
    "dentist", "pharmacist", "veterinarian", "programmer", "developer",
]

HEALTH_KEYWORDS = [
    "diabetes", "cancer", "heart disease", "hypertension", "asthma",
    "arthritis", "alzheimer", "dementia", "stroke", "allergies",
    "depression", "anxiety", "epilepsy", "obesity", "anemia",
    "cholesterol", "thyroid", "surgery", "hospital", "medication",
]

MILESTONE_KEYWORDS = [
    "graduated", "married", "divorced", "retired", "promoted",
    "moved to", "immigrated", "enlisted", "founded", "published",
    "won award", "born", "baptized", "confirmed", "ordained",
]

INTEREST_KEYWORDS = [
    "hiking", "fishing", "cooking", "gardening", "reading", "painting",
    "photography", "woodworking", "knitting", "quilting", "hunting",
    "camping", "traveling", "singing", "dancing", "running", "swimming",
    "cycling", "chess", "piano", "guitar", "volunteering",
]

# ── Date pattern ─────────────────────────────────────────────────

DATE_PATTERN = re.compile(
    r'\b('
    r'\d{4}[-/]\d{1,2}[-/]\d{1,2}'      # 2010-03-15
    r'|\d{1,2}[-/]\d{1,2}[-/]\d{4}'      # 03/15/2010
    r'|(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\w*\.?\s+\d{1,2},?\s+\d{4}'  # March 15, 2010
    r'|\d{1,2}\s+(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\w*\.?\s+\d{4}'    # 15 March 2010
    r')\b',
    re.IGNORECASE,
)

LOCATION_PATTERN = re.compile(
    r'\b(?:born in|lived in|moved to|from|residing in|located in)\s+([A-Z][a-zA-Z\s,]+)',
    re.IGNORECASE,
)


# ═════════════════════════════════════════════════════════════════
#  MediaIntelligenceService
# ═════════════════════════════════════════════════════════════════

class MediaIntelligenceService:
    """
    Extracts structured insights from text, images, and video
    about family members. All processing is permission-gated.
    """

    # ── In-memory permission + info stack stores ─────────────────

    def __init__(self):
        # member_id -> permission dict
        self._permissions: Dict[str, Dict[str, Any]] = {}
        # member_id -> list of info stack entries
        self._info_stacks: Dict[str, List[Dict[str, Any]]] = {}
        # member_id -> list of uploaded media metadata
        self._uploads: Dict[str, List[Dict[str, Any]]] = {}

    # ── Permission management ────────────────────────────────────

    def get_permissions(self, member_id: str) -> Dict[str, Any]:
        return self._permissions.get(member_id, {
            "member_id": member_id,
            "allow_ai_processing": False,
            "allow_image_analysis": False,
            "allow_video_analysis": False,
            "allow_text_analysis": False,
            "granted_at": None,
            "granted_by": "",
        })

    def update_permissions(self, member_id: str, perms: Dict[str, Any]) -> Dict[str, Any]:
        current = self.get_permissions(member_id)
        current.update(perms)
        current["member_id"] = member_id
        if perms.get("allow_ai_processing"):
            current["granted_at"] = datetime.utcnow().isoformat()
        self._permissions[member_id] = current
        return current

    def _check_permission(self, member_id: str, media_type: str) -> bool:
        perms = self.get_permissions(member_id)
        if not perms.get("allow_ai_processing"):
            return False
        type_map = {
            "text": "allow_text_analysis",
            "document": "allow_text_analysis",
            "image": "allow_image_analysis",
            "video": "allow_video_analysis",
        }
        return perms.get(type_map.get(media_type, "allow_text_analysis"), False)

    # ── Text extraction ──────────────────────────────────────────

    async def extract_from_text(
        self,
        text: str,
        member_id: str,
        member_name: str = "",
    ) -> Dict[str, Any]:
        """
        NLP-style extraction from plain text about a family member.
        Returns ExtractionResult-shaped dict.
        """
        if not self._check_permission(member_id, "text"):
            return {
                "member_id": member_id,
                "member_name": member_name,
                "media_type": "text",
                "raw_summary": "Permission denied: AI text analysis not enabled for this member.",
                "insights": [],
                "extracted_at": datetime.utcnow().isoformat(),
            }

        insights: List[Dict[str, Any]] = []
        text_lower = text.lower()
        words = re.findall(r'\b\w+\b', text_lower)

        # ── Trait extraction
        for keyword, _ in TRAIT_KEYWORDS.items():
            if keyword in words:
                context = self._find_context(text, keyword)
                insights.append({
                    "id": str(uuid.uuid4())[:8],
                    "category": "trait",
                    "label": keyword.title(),
                    "value": f"Described as {keyword}",
                    "confidence": 0.75,
                    "source_snippet": context,
                    "source_media_type": "text",
                    "approved": False,
                })

        # ── Occupation extraction
        for occ in OCCUPATION_KEYWORDS:
            if occ in text_lower:
                context = self._find_context(text, occ)
                insights.append({
                    "id": str(uuid.uuid4())[:8],
                    "category": "occupation",
                    "label": "Occupation",
                    "value": occ.title(),
                    "confidence": 0.8,
                    "source_snippet": context,
                    "source_media_type": "text",
                    "approved": False,
                })

        # ── Health indicator extraction
        for health in HEALTH_KEYWORDS:
            if health in text_lower:
                context = self._find_context(text, health)
                insights.append({
                    "id": str(uuid.uuid4())[:8],
                    "category": "health",
                    "label": "Health Indicator",
                    "value": health.title(),
                    "confidence": 0.7,
                    "source_snippet": context,
                    "source_media_type": "text",
                    "approved": False,
                })

        # ── Milestone extraction
        for milestone in MILESTONE_KEYWORDS:
            if milestone in text_lower:
                context = self._find_context(text, milestone)
                insights.append({
                    "id": str(uuid.uuid4())[:8],
                    "category": "milestone",
                    "label": "Milestone",
                    "value": context,
                    "confidence": 0.7,
                    "source_snippet": context,
                    "source_media_type": "text",
                    "approved": False,
                })

        # ── Date extraction
        for match in DATE_PATTERN.finditer(text):
            insights.append({
                "id": str(uuid.uuid4())[:8],
                "category": "date",
                "label": "Date Reference",
                "value": match.group(0).strip(),
                "confidence": 0.85,
                "source_snippet": text[max(0, match.start()-30):match.end()+30],
                "source_media_type": "text",
                "approved": False,
            })

        # ── Location extraction
        for match in LOCATION_PATTERN.finditer(text):
            loc = match.group(1).strip().rstrip('.')
            insights.append({
                "id": str(uuid.uuid4())[:8],
                "category": "location",
                "label": "Location",
                "value": loc,
                "confidence": 0.7,
                "source_snippet": match.group(0),
                "source_media_type": "text",
                "approved": False,
            })

        # ── Interest extraction
        for interest in INTEREST_KEYWORDS:
            if interest in text_lower:
                context = self._find_context(text, interest)
                insights.append({
                    "id": str(uuid.uuid4())[:8],
                    "category": "interest",
                    "label": "Interest",
                    "value": interest.title(),
                    "confidence": 0.65,
                    "source_snippet": context,
                    "source_media_type": "text",
                    "approved": False,
                })

        # Deduplicate by value
        seen = set()
        unique_insights = []
        for ins in insights:
            key = (ins["category"], ins["value"].lower())
            if key not in seen:
                seen.add(key)
                unique_insights.append(ins)

        # Build summary
        cats = {}
        for ins in unique_insights:
            cats.setdefault(ins["category"], []).append(ins["value"])
        summary_parts = [f"{cat}: {', '.join(vals)}" for cat, vals in cats.items()]
        raw_summary = f"Extracted {len(unique_insights)} insights from text. " + "; ".join(summary_parts) if summary_parts else "No insights extracted."

        return {
            "member_id": member_id,
            "member_name": member_name,
            "media_type": "text",
            "raw_summary": raw_summary,
            "insights": unique_insights,
            "extracted_at": datetime.utcnow().isoformat(),
        }

    # ── Image extraction ─────────────────────────────────────────

    async def extract_from_image(
        self,
        image_b64: str,
        member_id: str,
        member_name: str = "",
        filename: str = "",
    ) -> Dict[str, Any]:
        """
        Analyze an image to extract context about a family member.
        Uses heuristics on filename and basic metadata;
        a real implementation would use a vision model.
        """
        if not self._check_permission(member_id, "image"):
            return {
                "member_id": member_id,
                "member_name": member_name,
                "media_type": "image",
                "raw_summary": "Permission denied: AI image analysis not enabled for this member.",
                "insights": [],
                "extracted_at": datetime.utcnow().isoformat(),
            }

        insights: List[Dict[str, Any]] = []
        fname_lower = filename.lower()

        # Infer from filename
        if any(w in fname_lower for w in ["wedding", "marriage", "ceremony"]):
            insights.append({
                "id": str(uuid.uuid4())[:8],
                "category": "milestone",
                "label": "Wedding Photo",
                "value": f"Photo appears to be from a wedding/ceremony",
                "confidence": 0.6,
                "source_snippet": f"Filename: {filename}",
                "source_media_type": "image",
                "approved": False,
            })

        if any(w in fname_lower for w in ["graduation", "grad", "diploma"]):
            insights.append({
                "id": str(uuid.uuid4())[:8],
                "category": "milestone",
                "label": "Graduation Photo",
                "value": f"Photo appears to be from a graduation",
                "confidence": 0.6,
                "source_snippet": f"Filename: {filename}",
                "source_media_type": "image",
                "approved": False,
            })

        if any(w in fname_lower for w in ["baby", "newborn", "birth"]):
            insights.append({
                "id": str(uuid.uuid4())[:8],
                "category": "milestone",
                "label": "Birth/Baby Photo",
                "value": f"Photo appears to be of a newborn or baby",
                "confidence": 0.55,
                "source_snippet": f"Filename: {filename}",
                "source_media_type": "image",
                "approved": False,
            })

        if any(w in fname_lower for w in ["military", "uniform", "service"]):
            insights.append({
                "id": str(uuid.uuid4())[:8],
                "category": "occupation",
                "label": "Military Service",
                "value": "Possible military service or uniform photo",
                "confidence": 0.5,
                "source_snippet": f"Filename: {filename}",
                "source_media_type": "image",
                "approved": False,
            })

        # Date from filename patterns like IMG_20100315
        date_match = re.search(r'(\d{4})(\d{2})(\d{2})', filename)
        if date_match:
            y, m, d = date_match.groups()
            if 1900 <= int(y) <= 2030 and 1 <= int(m) <= 12 and 1 <= int(d) <= 31:
                insights.append({
                    "id": str(uuid.uuid4())[:8],
                    "category": "date",
                    "label": "Photo Date",
                    "value": f"{y}-{m}-{d}",
                    "confidence": 0.7,
                    "source_snippet": f"Extracted from filename: {filename}",
                    "source_media_type": "image",
                    "approved": False,
                })

        # Image size heuristic
        try:
            img_bytes = base64.b64decode(image_b64)
            size_kb = len(img_bytes) / 1024
            insights.append({
                "id": str(uuid.uuid4())[:8],
                "category": "other",
                "label": "Photo Metadata",
                "value": f"Image file ({size_kb:.0f} KB)",
                "confidence": 1.0,
                "source_snippet": filename,
                "source_media_type": "image",
                "approved": False,
            })
        except Exception:
            pass

        # Always add a general appearance entry for the user to fill in
        insights.append({
            "id": str(uuid.uuid4())[:8],
            "category": "appearance",
            "label": "Appearance Note",
            "value": f"Photo of {member_name or 'family member'} — add description",
            "confidence": 0.3,
            "source_snippet": filename,
            "source_media_type": "image",
            "approved": False,
        })

        return {
            "member_id": member_id,
            "member_name": member_name,
            "media_type": "image",
            "raw_summary": f"Analyzed image '{filename}'. Found {len(insights)} potential insights.",
            "insights": insights,
            "extracted_at": datetime.utcnow().isoformat(),
        }

    # ── Video extraction ─────────────────────────────────────────

    async def extract_from_video(
        self,
        video_b64: str,
        member_id: str,
        member_name: str = "",
        filename: str = "",
    ) -> Dict[str, Any]:
        """
        Analyze a video. In production this would extract key-frames
        and run them through image analysis. For now, we use filename
        heuristics similar to image analysis.
        """
        if not self._check_permission(member_id, "video"):
            return {
                "member_id": member_id,
                "member_name": member_name,
                "media_type": "video",
                "raw_summary": "Permission denied: AI video analysis not enabled for this member.",
                "insights": [],
                "extracted_at": datetime.utcnow().isoformat(),
            }

        insights: List[Dict[str, Any]] = []
        fname_lower = filename.lower()

        # Filename heuristics
        event_keywords = {
            "wedding": "Wedding Video",
            "graduation": "Graduation Video",
            "birthday": "Birthday Video",
            "reunion": "Family Reunion Video",
            "interview": "Interview Recording",
            "memorial": "Memorial Video",
            "christmas": "Christmas Gathering",
            "thanksgiving": "Thanksgiving Gathering",
        }

        for keyword, label in event_keywords.items():
            if keyword in fname_lower:
                insights.append({
                    "id": str(uuid.uuid4())[:8],
                    "category": "milestone",
                    "label": label,
                    "value": f"Video appears to be a {label.lower()}",
                    "confidence": 0.55,
                    "source_snippet": f"Filename: {filename}",
                    "source_media_type": "video",
                    "approved": False,
                })

        # Date from filename
        date_match = re.search(r'(\d{4})(\d{2})(\d{2})', filename)
        if date_match:
            y, m, d = date_match.groups()
            if 1900 <= int(y) <= 2030 and 1 <= int(m) <= 12 and 1 <= int(d) <= 31:
                insights.append({
                    "id": str(uuid.uuid4())[:8],
                    "category": "date",
                    "label": "Video Date",
                    "value": f"{y}-{m}-{d}",
                    "confidence": 0.7,
                    "source_snippet": f"Extracted from filename: {filename}",
                    "source_media_type": "video",
                    "approved": False,
                })

        # Video size
        try:
            vid_bytes = base64.b64decode(video_b64)
            size_mb = len(vid_bytes) / (1024 * 1024)
            insights.append({
                "id": str(uuid.uuid4())[:8],
                "category": "other",
                "label": "Video Metadata",
                "value": f"Video file ({size_mb:.1f} MB)",
                "confidence": 1.0,
                "source_snippet": filename,
                "source_media_type": "video",
                "approved": False,
            })
        except Exception:
            pass

        return {
            "member_id": member_id,
            "member_name": member_name,
            "media_type": "video",
            "raw_summary": f"Analyzed video '{filename}'. Found {len(insights)} potential insights. Key-frame analysis would be available with a vision model.",
            "insights": insights,
            "extracted_at": datetime.utcnow().isoformat(),
        }

    # ── Info Stack management ────────────────────────────────────

    def get_info_stack(self, member_id: str) -> List[Dict[str, Any]]:
        return list(self._info_stacks.get(member_id, []))

    def add_to_info_stack(
        self,
        member_id: str,
        entries: List[Dict[str, Any]],
    ) -> List[Dict[str, Any]]:
        """Add approved insights to the member's info stack."""
        stack = self._info_stacks.setdefault(member_id, [])
        now = datetime.utcnow().isoformat()
        for entry in entries:
            entry.setdefault("id", str(uuid.uuid4())[:8])
            entry.setdefault("created_at", now)
            entry.setdefault("updated_at", now)
            entry["approved"] = True
            stack.append(entry)
        return stack

    def update_info_stack(
        self,
        member_id: str,
        updated_entries: List[Dict[str, Any]],
        deleted_ids: Optional[List[str]] = None,
    ) -> List[Dict[str, Any]]:
        """Replace/update entries and remove deleted ones."""
        now = datetime.utcnow().isoformat()

        # Remove deleted
        if deleted_ids:
            stack = [e for e in self._info_stacks.get(member_id, []) if e.get("id") not in deleted_ids]
            self._info_stacks[member_id] = stack

        # Update existing or add new
        stack = self._info_stacks.setdefault(member_id, [])
        existing_ids = {e.get("id") for e in stack}

        for entry in updated_entries:
            entry["updated_at"] = now
            eid = entry.get("id")
            if eid and eid in existing_ids:
                # Replace existing
                for i, e in enumerate(stack):
                    if e.get("id") == eid:
                        stack[i] = entry
                        break
            else:
                entry.setdefault("id", str(uuid.uuid4())[:8])
                entry.setdefault("created_at", now)
                stack.append(entry)

        return stack

    # ── Upload tracking ──────────────────────────────────────────

    def record_upload(self, member_id: str, media_type: str, filename: str) -> Dict[str, Any]:
        record = {
            "id": str(uuid.uuid4())[:8],
            "member_id": member_id,
            "media_type": media_type,
            "filename": filename,
            "uploaded_at": datetime.utcnow().isoformat(),
        }
        self._uploads.setdefault(member_id, []).append(record)
        return record

    def get_uploads(self, member_id: str) -> List[Dict[str, Any]]:
        return list(self._uploads.get(member_id, []))

    # ── Private helpers ──────────────────────────────────────────

    def _find_context(self, text: str, keyword: str, window: int = 60) -> str:
        """Find surrounding context for a keyword in text."""
        idx = text.lower().find(keyword.lower())
        if idx == -1:
            return ""
        start = max(0, idx - window)
        end = min(len(text), idx + len(keyword) + window)
        snippet = text[start:end].strip()
        if start > 0:
            snippet = "…" + snippet
        if end < len(text):
            snippet = snippet + "…"
        return snippet


# ── Singleton ────────────────────────────────────────────────────

media_intelligence = MediaIntelligenceService()
