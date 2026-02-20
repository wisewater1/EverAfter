from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from typing import Dict, Any

from app.db.session import get_async_session
from app.auth.dependencies import get_current_user
from app.services.monitoring_service import SaintsMonitoringService

router = APIRouter(prefix="/api/v1/monitoring", tags=["monitoring"])

@router.get("/status")
async def get_system_status(
    current_user: dict = Depends(get_current_user),
    session: AsyncSession = Depends(get_async_session)
):
    """
    Get the "Guardian Status" from St. Michael, St. Gabriel, and St. Anthony.
    Returns real-time system health, security metrics, and data integrity checks.
    """
    service = SaintsMonitoringService(session)
    return await service.get_system_status()

@router.get("/metrics")
async def get_metrics(
    current_user: dict = Depends(get_current_user)
):
    """
    Get detailed time-series metrics.
    """
    from app.services.metrics_collector import metrics_collector
    return metrics_collector.get_metrics()
