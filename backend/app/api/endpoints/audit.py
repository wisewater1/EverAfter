import os
from datetime import datetime, timedelta
from typing import Any, Optional

from fastapi import APIRouter, Body, Depends, Query, HTTPException
from fastapi.responses import FileResponse, JSONResponse
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import or_, select, text

from app.auth.dependencies import get_current_user
from app.db.session import get_engine, get_session
from app.models.audit import AuditLog, JITAccessRequest, ComplianceControl
from app.services.ledger_service import LedgerService
from app.services.vulnerability_service import vulnerability_service
from app.core.config import settings

router = APIRouter()
_jit_table_ready = False


async def ensure_jit_access_table() -> None:
    global _jit_table_ready
    if _jit_table_ready:
        return

    engine = get_engine()
    async with engine.begin() as conn:
        await conn.execute(
            text(
                """
                CREATE TABLE IF NOT EXISTS jit_access_requests (
                    id TEXT PRIMARY KEY,
                    "userId" TEXT NOT NULL,
                    "targetResource" TEXT NOT NULL,
                    reason TEXT NOT NULL,
                    status TEXT NOT NULL DEFAULT 'PENDING',
                    "expiresAt" TIMESTAMP NOT NULL,
                    "createdAt" TIMESTAMP NOT NULL DEFAULT NOW(),
                    "approvedBy" TEXT NULL,
                    "approvedAt" TIMESTAMP NULL
                )
                """
            )
        )
    _jit_table_ready = True


def _iso(value: Optional[datetime]) -> Optional[str]:
    return value.isoformat() if value else None


def _severity_rank(severity: Optional[str]) -> int:
    return {
        "healthy": 0,
        "active": 0,
        "low": 1,
        "warning": 2,
        "medium": 2,
        "high": 3,
        "error": 3,
        "critical": 4,
    }.get((severity or "").lower(), 0)


def _component_to_node(component: Optional[str]) -> str:
    value = (component or "").lower()
    if any(token in value for token in ("mobile", "frontend", "client", "browser", "ui")):
        return "mobile_app"
    if any(token in value for token in ("auth", "api", "gateway", "edge")):
        return "api_gateway"
    if any(token in value for token in ("db", "database", "postgres", "sql", "vault")):
        return "postgres"
    return "saint_runtime"


def _status_from_score(score: int) -> str:
    if score >= 3:
        return "critical"
    if score >= 1:
        return "warning"
    return "healthy"


def _serialize_log(log: AuditLog) -> dict[str, Any]:
    return {
        "id": log.id,
        "action": log.action,
        "userId": log.userId,
        "provider": log.provider,
        "sha256": log.sha256,
        "prevHash": log.prevHash,
        "signature": log.signature,
        "signerId": log.signerId,
        "ts": _iso(log.ts),
        "metadata": log.metadata_,
    }


def _serialize_jit_request(request: JITAccessRequest) -> dict[str, Any]:
    now = datetime.utcnow()
    time_remaining_minutes = max(int((request.expiresAt - now).total_seconds() // 60), 0)
    return {
        "id": request.id,
        "userId": request.userId,
        "targetResource": request.targetResource,
        "reason": request.reason,
        "status": request.status,
        "expiresAt": _iso(request.expiresAt),
        "createdAt": _iso(request.createdAt),
        "approvedBy": request.approvedBy,
        "approvedAt": _iso(request.approvedAt),
        "timeRemainingMinutes": time_remaining_minutes,
    }


async def _expire_jit_requests(db: AsyncSession) -> None:
    now = datetime.utcnow()
    stmt = select(JITAccessRequest).where(
        JITAccessRequest.status.in_(["PENDING", "APPROVED"]),
        JITAccessRequest.expiresAt < now,
    )
    result = await db.execute(stmt)
    expired_requests = result.scalars().all()
    if not expired_requests:
        return

    for request in expired_requests:
        request.status = "EXPIRED"
    await db.commit()

@router.get("/ledger")
async def get_ledger(
    limit: int = Query(50),
    offset: int = Query(0),
    db: AsyncSession = Depends(get_session)
):
    """Fetch the recent verifiable audit ledger entries."""
    stmt = select(AuditLog).order_by(AuditLog.ts.desc()).offset(offset).limit(limit)
    result = await db.execute(stmt)
    logs = result.scalars().all()
    
    return {
        "success": True,
        "data": [_serialize_log(log) for log in logs]
    }

@router.get("/ledger/export")
async def export_ledger_package(db: AsyncSession = Depends(get_session)):
    """Export the entire ledger as a JSON proof package."""
    stmt = select(AuditLog).order_by(AuditLog.ts.asc())
    result = await db.execute(stmt)
    logs = result.scalars().all()
    
    export_data = {
        "export_timestamp": "now",
        "system_fingerprint": getattr(settings, "SERVER_FINGERPRINT", "st_anthony_auditor"),
        "logs": [_serialize_log(log) for log in logs]
    }
    
    return JSONResponse(content=export_data)

@router.get("/verifier-script")
async def get_verifier_script():
    """Download the lightweight offline verifier script."""
    script_path = os.path.join(os.path.dirname(os.path.dirname(__file__)), "offline_verifier.py")
    if not os.path.exists(script_path):
        raise HTTPException(status_code=404, detail="Verifier script not found.")
    return FileResponse(
        script_path, 
        media_type="text/x-python",
        filename="st_anthony_verifier.py"
    )

@router.get("/controls/readiness")
async def get_compliance_readiness(db: AsyncSession = Depends(get_session)):
    """Calculate the Always-green audit readiness score and control graph."""
    stmt = select(ComplianceControl)
    result = await db.execute(stmt)
    controls = result.scalars().all()
    
    if not controls:
        return {"success": True, "readiness_score": 100, "controls": []}

    passed = sum(1 for c in controls if c.isPassing)
    score = int((passed / len(controls)) * 100)
    
    return {
        "success": True,
        "readiness_score": score,
        "controls": [
            {
                "id": c.id,
                "controlId": c.controlId,
                "description": c.description,
                "isPassing": c.isPassing,
                "lastCheckedAt": _iso(c.lastCheckedAt),
            } for c in controls
        ]
    }


@router.get("/flow-map")
async def get_dynamic_flow_map(
    current_user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_session),
):
    user_id = current_user.get("id")

    vulnerability_service.session = db
    vulnerabilities = await vulnerability_service.get_latest_vulnerabilities()

    michael_stmt = (
        select(AuditLog)
        .where(AuditLog.action == "security/michael_full_scan_completed")
        .order_by(AuditLog.ts.desc())
        .limit(1)
    )
    anthony_stmt = (
        select(AuditLog)
        .where(AuditLog.action == "audit/anthony_scan_received")
        .order_by(AuditLog.ts.desc())
        .limit(1)
    )
    recent_stmt = (
        select(AuditLog)
        .where(
            or_(
                AuditLog.provider.in_(["st_michael", "st_anthony"]),
                AuditLog.action.like("security/%"),
                AuditLog.action.like("audit/%"),
                AuditLog.action.like("jit_access/%"),
            )
        )
        .order_by(AuditLog.ts.desc())
        .limit(12)
    )

    michael_result = await db.execute(michael_stmt)
    anthony_result = await db.execute(anthony_stmt)
    recent_result = await db.execute(recent_stmt)

    michael_scan = michael_result.scalars().first()
    anthony_handoff = anthony_result.scalars().first()
    recent_logs = recent_result.scalars().all()

    evidence: list[dict[str, Any]] = []
    evidence_by_id: dict[str, dict[str, Any]] = {}

    def push_evidence(item: dict[str, Any]) -> None:
        evidence_by_id[item["id"]] = item

    if michael_scan:
        michael_metadata = michael_scan.metadata_ or {}
        push_evidence(
            {
                "id": michael_scan.id,
                "type": "scan",
                "title": "St. Michael full scan completed",
                "summary": f"{michael_metadata.get('findings_count', 0)} findings across the application gauntlet.",
                "severity": michael_metadata.get("status", "healthy"),
                "timestamp": _iso(michael_scan.ts),
                "provider": michael_scan.provider,
                "action": michael_scan.action,
                "metadata": michael_metadata,
            }
        )

    if anthony_handoff:
        anthony_metadata = anthony_handoff.metadata_ or {}
        push_evidence(
            {
                "id": anthony_handoff.id,
                "type": "audit_handoff",
                "title": "Anthony audit handoff received",
                "summary": "St. Anthony received St. Michael findings and sealed them into the ledger.",
                "severity": anthony_metadata.get("status", "warning"),
                "timestamp": _iso(anthony_handoff.ts),
                "provider": anthony_handoff.provider,
                "action": anthony_handoff.action,
                "metadata": anthony_metadata,
            }
        )

    node_evidence: dict[str, list[str]] = {
        "mobile_app": [],
        "api_gateway": [],
        "saint_runtime": [],
        "postgres": [],
        "st_michael": [],
        "st_anthony": [],
    }
    node_risk: dict[str, int] = {node_id: 0 for node_id in node_evidence}

    for vulnerability in vulnerabilities:
        evidence_id = f"vuln-{vulnerability.get('id') or vulnerability.get('cveId')}"
        severity = (vulnerability.get("severity") or "low").lower()
        node_id = _component_to_node(vulnerability.get("affectedComponent"))
        push_evidence(
            {
                "id": evidence_id,
                "type": "vulnerability",
                "title": vulnerability.get("title") or vulnerability.get("cveId") or "Tracked vulnerability",
                "summary": vulnerability.get("description") or "Security finding supplied by St. Michael.",
                "severity": severity,
                "timestamp": vulnerability.get("publishedDate"),
                "provider": "st_michael",
                "action": "security/vulnerability_tracked",
                "metadata": vulnerability,
            }
        )
        node_evidence[node_id].append(evidence_id)
        node_evidence["st_michael"].append(evidence_id)
        node_risk[node_id] = max(node_risk[node_id], _severity_rank(severity))
        node_risk["st_michael"] = max(node_risk["st_michael"], _severity_rank(severity))

    if michael_scan:
        for node_id in ("api_gateway", "saint_runtime", "st_michael"):
            node_evidence[node_id].append(michael_scan.id)
        findings_count = int(michael_scan.metadata_.get("findings_count", 0) or 0)
        if findings_count >= 5:
            node_risk["api_gateway"] = max(node_risk["api_gateway"], 3)
            node_risk["saint_runtime"] = max(node_risk["saint_runtime"], 3)
        elif findings_count > 0:
            node_risk["api_gateway"] = max(node_risk["api_gateway"], 2)
            node_risk["saint_runtime"] = max(node_risk["saint_runtime"], 2)

    if anthony_handoff:
        for node_id in ("st_anthony", "postgres"):
            node_evidence[node_id].append(anthony_handoff.id)
        node_risk["st_anthony"] = max(
            node_risk["st_anthony"],
            _severity_rank((anthony_handoff.metadata_ or {}).get("status")),
        )

    for log in recent_logs:
        if log.id in evidence_by_id:
            continue
        push_evidence(
            {
                "id": log.id,
                "type": "ledger",
                "title": log.action.replace("_", " ").replace("/", " / "),
                "summary": f"Ledger event from {log.provider or 'system'}.",
                "severity": "warning" if "jit_access" in log.action else "healthy",
                "timestamp": _iso(log.ts),
                "provider": log.provider,
                "action": log.action,
                "metadata": log.metadata_,
            }
        )
        if log.provider == "st_anthony" or log.action.startswith("audit/"):
            node_evidence["st_anthony"].append(log.id)
        if log.provider == "st_michael" or log.action.startswith("security/"):
            node_evidence["st_michael"].append(log.id)

    evidence = list(evidence_by_id.values())
    latest_status = (michael_scan.metadata_.get("status") if michael_scan and michael_scan.metadata_ else None) or "healthy"
    latest_findings = int((michael_scan.metadata_ or {}).get("findings_count", 0) if michael_scan else 0)
    latest_integrity = (michael_scan.metadata_ or {}).get("system_integrity") if michael_scan else None
    anthony_handoff_status = (anthony_handoff.metadata_ or {}).get("handoff", "pending") if anthony_handoff else "pending"
    critical_vulnerabilities = sum(1 for item in vulnerabilities if (item.get("severity") or "").lower() == "critical")

    nodes = [
        {
            "id": "mobile_app",
            "label": "Mobile App",
            "kind": "system",
            "status": _status_from_score(node_risk["mobile_app"]),
            "details": "User-facing capture surface entering the protected data path.",
            "evidenceCount": len(node_evidence["mobile_app"]),
            "evidenceIds": node_evidence["mobile_app"],
        },
        {
            "id": "api_gateway",
            "label": "API Gateway",
            "kind": "boundary",
            "status": _status_from_score(max(node_risk["api_gateway"], _severity_rank(latest_status))),
            "details": f"Latest Michael scan status: {latest_status}. Findings: {latest_findings}.",
            "evidenceCount": len(node_evidence["api_gateway"]),
            "evidenceIds": node_evidence["api_gateway"],
        },
        {
            "id": "saint_runtime",
            "label": "Saint Runtime",
            "kind": "compute",
            "status": _status_from_score(node_risk["saint_runtime"]),
            "details": "Protected runtime where Saint services and audit logic execute.",
            "evidenceCount": len(node_evidence["saint_runtime"]),
            "evidenceIds": node_evidence["saint_runtime"],
        },
        {
            "id": "postgres",
            "label": "Postgres",
            "kind": "storage",
            "status": _status_from_score(node_risk["postgres"]),
            "details": "Evidence and operational state sealed into the ledger-backed database.",
            "evidenceCount": len(node_evidence["postgres"]),
            "evidenceIds": node_evidence["postgres"],
        },
        {
            "id": "st_michael",
            "label": "St. Michael",
            "kind": "guardian",
            "status": _status_from_score(max(node_risk["st_michael"], _severity_rank(latest_status))),
            "details": f"Guardian scan last recorded {latest_findings} findings with {critical_vulnerabilities} critical vulnerabilities tracked.",
            "evidenceCount": len(node_evidence["st_michael"]),
            "evidenceIds": node_evidence["st_michael"],
        },
        {
            "id": "st_anthony",
            "label": "St. Anthony",
            "kind": "audit",
            "status": _status_from_score(node_risk["st_anthony"]),
            "details": f"Audit handoff is {anthony_handoff_status}. Anthony is assembling the evidence pack for review.",
            "evidenceCount": len(node_evidence["st_anthony"]),
            "evidenceIds": node_evidence["st_anthony"],
        },
    ]

    edges = [
        {
            "id": "mobile_to_api",
            "from": "mobile_app",
            "to": "api_gateway",
            "label": "Authenticated client traffic",
            "severity": _status_from_score(max(node_risk["mobile_app"], node_risk["api_gateway"])),
            "evidenceIds": list(dict.fromkeys(node_evidence["mobile_app"] + node_evidence["api_gateway"])),
        },
        {
            "id": "api_to_runtime",
            "from": "api_gateway",
            "to": "saint_runtime",
            "label": f"Runtime ingress validated by Michael ({latest_findings} findings)",
            "severity": _status_from_score(max(node_risk["api_gateway"], node_risk["saint_runtime"])),
            "evidenceIds": list(dict.fromkeys(node_evidence["api_gateway"] + node_evidence["saint_runtime"])),
        },
        {
            "id": "runtime_to_postgres",
            "from": "saint_runtime",
            "to": "postgres",
            "label": "Ledger and PHI persistence boundary",
            "severity": _status_from_score(max(node_risk["saint_runtime"], node_risk["postgres"])),
            "evidenceIds": list(dict.fromkeys(node_evidence["saint_runtime"] + node_evidence["postgres"])),
        },
        {
            "id": "michael_to_anthony",
            "from": "st_michael",
            "to": "st_anthony",
            "label": "Full scan handoff for audit review",
            "severity": _status_from_score(max(node_risk["st_michael"], node_risk["st_anthony"])),
            "evidenceIds": list(
                dict.fromkeys(
                    ([michael_scan.id] if michael_scan else [])
                    + ([anthony_handoff.id] if anthony_handoff else [])
                )
            ),
        },
        {
            "id": "anthony_to_postgres",
            "from": "st_anthony",
            "to": "postgres",
            "label": "Evidence pack sealed into ledger",
            "severity": _status_from_score(max(node_risk["st_anthony"], node_risk["postgres"])),
            "evidenceIds": list(dict.fromkeys(node_evidence["st_anthony"] + node_evidence["postgres"])),
        },
    ]

    return {
        "success": True,
        "generatedAt": datetime.utcnow().isoformat(),
        "requestedBy": user_id,
        "summary": {
            "latestScanStatus": latest_status,
            "findingsCount": latest_findings,
            "vulnerabilitiesCount": len(vulnerabilities),
            "criticalVulnerabilities": critical_vulnerabilities,
            "integrity": latest_integrity,
            "anthonyHandoffStatus": anthony_handoff_status,
        },
        "nodes": nodes,
        "edges": edges,
        "evidence": evidence,
    }


@router.get("/jit-access")
async def get_jit_access_requests(
    current_user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_session),
):
    await ensure_jit_access_table()
    await _expire_jit_requests(db)

    stmt = select(JITAccessRequest).order_by(JITAccessRequest.createdAt.desc())
    result = await db.execute(stmt)
    requests = result.scalars().all()

    return {
        "success": True,
        "currentUserId": current_user.get("id"),
        "data": [_serialize_jit_request(item) for item in requests],
    }


@router.post("/jit-access")
async def create_jit_access_request(
    payload: dict[str, Any] = Body(...),
    current_user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_session),
):
    await ensure_jit_access_table()

    target_resource = (payload.get("targetResource") or "").strip()
    reason = (payload.get("reason") or "").strip()
    duration_minutes = int(payload.get("durationMinutes") or 60)

    if not target_resource or not reason:
        raise HTTPException(status_code=400, detail="targetResource and reason are required")

    duration_minutes = max(15, min(duration_minutes, 24 * 60))
    now = datetime.utcnow()
    request = JITAccessRequest(
        userId=current_user.get("id"),
        targetResource=target_resource,
        reason=reason,
        status="PENDING",
        expiresAt=now + timedelta(minutes=duration_minutes),
    )
    db.add(request)
    await db.commit()
    await db.refresh(request)

    ledger = LedgerService(db)
    await ledger.log_event(
        action="jit_access/requested",
        user_id=current_user.get("id"),
        provider="st_anthony",
        metadata={
            "request_id": request.id,
            "target_resource": target_resource,
            "duration_minutes": duration_minutes,
            "reason": reason,
        },
    )

    return {"success": True, "data": _serialize_jit_request(request)}


@router.post("/jit-access/{request_id}/approve")
async def approve_jit_access_request(
    request_id: str,
    current_user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_session),
):
    await ensure_jit_access_table()
    stmt = select(JITAccessRequest).where(JITAccessRequest.id == request_id)
    result = await db.execute(stmt)
    request = result.scalars().first()
    if not request:
        raise HTTPException(status_code=404, detail="JIT access request not found")

    request.status = "APPROVED"
    request.approvedBy = current_user.get("id")
    request.approvedAt = datetime.utcnow()
    if request.expiresAt < request.approvedAt:
        request.expiresAt = request.approvedAt + timedelta(minutes=60)
    await db.commit()
    await db.refresh(request)

    ledger = LedgerService(db)
    await ledger.log_event(
        action="jit_access/approved",
        user_id=current_user.get("id"),
        provider="st_anthony",
        metadata={
            "request_id": request.id,
            "target_resource": request.targetResource,
            "requestor_id": request.userId,
            "expires_at": _iso(request.expiresAt),
        },
    )

    return {"success": True, "data": _serialize_jit_request(request)}


@router.post("/jit-access/{request_id}/reject")
async def reject_jit_access_request(
    request_id: str,
    current_user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_session),
):
    await ensure_jit_access_table()
    stmt = select(JITAccessRequest).where(JITAccessRequest.id == request_id)
    result = await db.execute(stmt)
    request = result.scalars().first()
    if not request:
        raise HTTPException(status_code=404, detail="JIT access request not found")

    request.status = "REJECTED"
    request.approvedBy = current_user.get("id")
    request.approvedAt = datetime.utcnow()
    await db.commit()
    await db.refresh(request)

    ledger = LedgerService(db)
    await ledger.log_event(
        action="jit_access/rejected",
        user_id=current_user.get("id"),
        provider="st_anthony",
        metadata={
            "request_id": request.id,
            "target_resource": request.targetResource,
            "requestor_id": request.userId,
        },
    )

    return {"success": True, "data": _serialize_jit_request(request)}
