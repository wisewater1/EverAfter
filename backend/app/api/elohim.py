"""Sealed-status API — which of the caller's artifacts are anchored in Elohim.

Read-only view over the ``elohim_anchors`` table that the anchor worker
(``app.workers.elohim_anchor``) maintains. Powers the "sealed" indicator on
the St Joseph quadrant (relative engrams / bonds).
"""

import logging
from typing import Optional
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth.dependencies import get_current_user
from app.db.session import get_async_session
from app.models.elohim import ElohimAnchor

router = APIRouter(prefix="/api/v1/elohim", tags=["elohim"])
logger = logging.getLogger(__name__)

MAX_REF_IDS = 200


@router.get("/anchors")
async def list_anchors(
    ref_ids: Optional[str] = Query(default=None, description="Comma-separated ref ids to check; omit for all of the caller's anchors (capped)."),
    session: AsyncSession = Depends(get_async_session),
    current_user: dict = Depends(get_current_user),
):
    sub = current_user.get("sub")
    if not sub:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="User ID not found")
    try:
        user_uuid = UUID(str(sub))
    except ValueError:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid user id")

    q = select(ElohimAnchor).where(ElohimAnchor.user_id == user_uuid)
    if ref_ids:
        ids = [r.strip() for r in ref_ids.split(",") if r.strip()][:MAX_REF_IDS]
        if not ids:
            return {"anchors": {}}
        q = q.where(ElohimAnchor.ref_id.in_(ids))
    q = q.limit(MAX_REF_IDS)

    try:
        rows = (await session.execute(q)).scalars().all()
    except Exception as e:
        # Table appears once the anchor worker has run; report "nothing sealed"
        # rather than erroring the UI before first provisioning.
        logger.info("elohim_anchors unavailable: %s: %s", type(e).__name__, e)
        return {"anchors": {}}

    return {
        "anchors": {
            row.ref_id: {
                "ref_type": row.ref_type,
                "sigil": row.sigil,
                "sealed_at": row.sealed_at.isoformat() if row.sealed_at else None,
            }
            for row in rows
        }
    }
