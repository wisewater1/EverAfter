"""
Media Intelligence API — upload, extract, manage info stacks.

Router prefix: /api/v1/media-intelligence
"""
from __future__ import annotations

from fastapi import APIRouter, Body
from typing import Dict, Any

router = APIRouter(prefix="/api/v1/media-intelligence", tags=["Media Intelligence"])


# ── Lazy service ─────────────────────────────────────────────────

def _svc():
    from app.services.media_intelligence import media_intelligence
    return media_intelligence


# ═════════════════════════════════════════════════════════════════
#  Upload + Extract
# ═════════════════════════════════════════════════════════════════


@router.post("/upload")
async def upload_media(payload: Dict[str, Any] = Body(...)):
    """
    Upload a file linked to a family member.
    Expects: member_id, media_type, filename, content (base64 or raw text),
             permissions_granted (bool).
    """
    svc = _svc()
    member_id = payload.get("member_id", "")
    media_type = payload.get("media_type", "text")
    filename = payload.get("filename", "unnamed")
    content = payload.get("content", "")
    perms_granted = payload.get("permissions_granted", False)

    if not member_id:
        return {"error": "member_id is required"}

    # Auto-grant permissions if user says so in the upload
    if perms_granted:
        svc.update_permissions(member_id, {
            "allow_ai_processing": True,
            "allow_text_analysis": True,
            "allow_image_analysis": True,
            "allow_video_analysis": True,
            "granted_by": "upload_flow",
        })

    # Record upload
    record = svc.record_upload(member_id, media_type, filename)

    return {
        "status": "uploaded",
        "upload": record,
        "permissions": svc.get_permissions(member_id),
    }


@router.post("/extract")
async def extract_from_media(payload: Dict[str, Any] = Body(...)):
    """
    Run AI extraction on uploaded media content.
    Expects: member_id, member_name, media_type, content, filename.
    """
    svc = _svc()
    member_id = payload.get("member_id", "")
    member_name = payload.get("member_name", "")
    media_type = payload.get("media_type", "text")
    content = payload.get("content", "")
    filename = payload.get("filename", "")

    if not member_id:
        return {"error": "member_id is required"}

    if media_type == "text" or media_type == "document":
        result = await svc.extract_from_text(content, member_id, member_name)
    elif media_type == "image":
        result = await svc.extract_from_image(content, member_id, member_name, filename)
    elif media_type == "video":
        result = await svc.extract_from_video(content, member_id, member_name, filename)
    else:
        return {"error": f"Unsupported media type: {media_type}"}

    return result


# ═════════════════════════════════════════════════════════════════
#  Info Stack CRUD
# ═════════════════════════════════════════════════════════════════


@router.get("/info-stack/{member_id}")
async def get_info_stack(member_id: str):
    """Get the full information stack for a family member."""
    svc = _svc()
    return {
        "member_id": member_id,
        "entries": svc.get_info_stack(member_id),
        "permissions": svc.get_permissions(member_id),
        "uploads": svc.get_uploads(member_id),
    }


@router.put("/info-stack/{member_id}")
async def update_info_stack(
    member_id: str,
    payload: Dict[str, Any] = Body(...),
):
    """
    Edit the info stack: add, update, or delete entries.
    Expects: entries (list of entry dicts), deleted_ids (list of str).
    """
    svc = _svc()
    entries = payload.get("entries", [])
    deleted_ids = payload.get("deleted_ids", [])

    updated = svc.update_info_stack(member_id, entries, deleted_ids)
    return {
        "member_id": member_id,
        "entries": updated,
        "count": len(updated),
    }


@router.post("/info-stack/{member_id}/commit")
async def commit_to_info_stack(
    member_id: str,
    payload: Dict[str, Any] = Body(...),
):
    """
    Commit approved AI-extracted insights to the info stack.
    Expects: insights (list of approved insight dicts).
    """
    svc = _svc()
    insights = payload.get("insights", [])
    approved = [i for i in insights if i.get("approved", False)]
    if not approved:
        return {"error": "No approved insights to commit"}

    stack = svc.add_to_info_stack(member_id, approved)
    return {
        "member_id": member_id,
        "committed": len(approved),
        "total_entries": len(stack),
        "entries": stack,
    }


# ═════════════════════════════════════════════════════════════════
#  Permissions
# ═════════════════════════════════════════════════════════════════


@router.get("/permissions/{member_id}")
async def get_permissions(member_id: str):
    """Get AI processing permissions for a family member."""
    return _svc().get_permissions(member_id)


@router.put("/permissions/{member_id}")
async def update_permissions(
    member_id: str,
    payload: Dict[str, Any] = Body(...),
):
    """Update AI processing permissions for a family member."""
    return _svc().update_permissions(member_id, payload)
