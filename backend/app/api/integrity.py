from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from app.db.session import get_session
from app.services.integrity_service import integrity_service
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
