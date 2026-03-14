from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from typing import Dict, Any

from app.db.session import get_async_session
from app.auth.dependencies import get_current_user
from app.services.monitoring_service import SaintsMonitoringService
from app.services.vulnerability_service import vulnerability_service
from app.services.ledger_service import LedgerService

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

@router.post("/michael/scan")
async def trigger_michael_scan(
    current_user: dict = Depends(get_current_user),
    session: AsyncSession = Depends(get_async_session)
):
    """
    Manually trigger a full security audit by St. Michael.
    """
    user_id = current_user.get("id")
    vulnerability_service.session = session # Temporary session injection
    scan_results = await vulnerability_service.perform_full_security_scan(user_id)

    ledger = LedgerService(session)
    michael_scan_log = await ledger.log_event(
        action="security/michael_full_scan_completed",
        user_id=user_id,
        provider="st_michael",
        metadata={
            "scan_scope": scan_results.get("scan_scope", "full_application"),
            "status": scan_results.get("status"),
            "findings_count": scan_results.get("findings_count", 0),
            "vulnerabilities_count": len(scan_results.get("vulnerabilities", [])),
            "system_integrity": scan_results.get("system_integrity"),
        },
    )
    anthony_handoff_log = await ledger.log_event(
        action="audit/anthony_scan_received",
        user_id=user_id,
        provider="st_anthony",
        metadata={
            "source": "st_michael",
            "scan_log_id": michael_scan_log.id,
            "status": scan_results.get("status"),
            "findings_count": scan_results.get("findings_count", 0),
            "system_integrity": scan_results.get("system_integrity"),
            "handoff": "completed",
        },
    )

    return {
        **scan_results,
        "audit_handoff": {
            "recipient": "st_anthony",
            "status": "completed",
            "scan_log_id": michael_scan_log.id,
            "ledger_entry_id": anthony_handoff_log.id,
            "tab": "ledger",
        },
    }

@router.get("/michael/vulnerabilities")
async def get_tracked_vulnerabilities(
    current_user: dict = Depends(get_current_user)
):
    """
    Get the list of live tracked CVEs from St. Michael's exploit tracker.
    """
    return await vulnerability_service.get_latest_vulnerabilities()
