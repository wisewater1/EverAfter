from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from app.db.session import get_session
from app.services.integrity_service import integrity_service
from app.services.hipaa_service import hipaa_service
from app.api.auth_utils import get_current_user_id
import logging

router = APIRouter()
logger = logging.getLogger(__name__)

@router.get("/dividends")
async def get_my_dividends(
    db: AsyncSession = Depends(get_session),
    user_id: str = Depends(get_current_user_id)
):
    try:
        total = await integrity_service.get_total_dividend(db, user_id)
        returning_history = await integrity_service.get_recent_history(db, user_id)
        
        return {
            "total_accumulated": total,
            "recent_history": [
                {
                    "created_at": h.created_at,
                    "score": h.score,
                    "findings_count": h.findings_count,
                    "dividend_accumulated": h.dividend_accumulated
                } for h in returning_history
            ]
        }
    except Exception as e:
        logger.error(f"Error fetching dividends: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/system-integrity")
async def get_system_integrity(
    db: AsyncSession = Depends(get_session)
):
    # Public or internal monitoring endpoint
    try:
        system_id = "00000000-0000-0000-0000-000000000000"
        total = await integrity_service.get_total_dividend(db, system_id)
        return {"system_integrity_pool": total}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ─── HIPAA Compliance Endpoints ──────────────────────────────────────────────

@router.get("/hipaa-report")
async def get_hipaa_report(
    user_id: str = Depends(get_current_user_id)
):
    """
    Returns the HIPAA compliance posture report.
    Certified by St. Michael (Security Officer §164.308) and St. Anthony (Audit Officer §164.312(b)).
    """
    try:
        report = hipaa_service.get_compliance_report(user_id)
        return report
    except Exception as e:
        logger.error(f"[HIPAA] Error generating compliance report: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/hipaa-access-log")
async def get_hipaa_access_log(
    limit: int = Query(default=50, ge=1, le=500),
    saint_id: str = Query(default=None),
    user_id: str = Depends(get_current_user_id)
):
    """
    Returns the immutable PHI access log (St. Anthony's Ledger).
    HIPAA Audit Controls §164.312(b).
    """
    try:
        log = hipaa_service.get_access_log(
            user_id=user_id,
            saint_id=saint_id,
            limit=limit,
        )
        return {
            "hipaa_rule": "§164.312(b) — Audit Controls",
            "audit_officer": "St. Anthony",
            "total_events": len(log),
            "events": log,
        }
    except Exception as e:
        logger.error(f"[HIPAA] Error fetching access log: {e}")
        raise HTTPException(status_code=500, detail=str(e))

