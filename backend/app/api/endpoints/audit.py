import json
import os
from fastapi import APIRouter, Depends, Query, HTTPException
from fastapi.responses import FileResponse, JSONResponse
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.db.session import get_session
from app.models.audit import AuditLog, JITAccessRequest, ComplianceControl
from app.services.ledger_service import LedgerService
from app.core.config import settings

router = APIRouter()

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
        "data": [
            {
                "id": log.id,
                "action": log.action,
                "userId": log.userId,
                "provider": log.provider,
                "sha256": log.sha256,
                "prevHash": log.prevHash,
                "signature": log.signature,
                "signerId": log.signerId,
                "ts": log.ts.isoformat() if log.ts else None,
                "metadata": log.metadata_
            }
            for log in logs
        ]
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
        "logs": [
            {
                "id": log.id,
                "action": log.action,
                "userId": log.userId,
                "sha256": log.sha256,
                "prevHash": log.prevHash,
                "signature": log.signature,
                "ts": log.ts.isoformat() if log.ts else "",
                "metadata": log.metadata_
            }
            for log in logs
        ]
    }
    
    return JSONResponse(content=export_data)

@router.get("/verifier-script")
async def get_verifier_script():
    """Download the lightweight offline verifier script."""
    # Assuming script is in the same directory as this router for simplicity
    script_path = os.path.join(os.path.dirname(__file__), "offline_verifier.py")
    if not os.path.exists(script_path):
        raise HTTPException(status_code=404, detail="Verifier script not found.")
    return FileResponse(
        script_path, 
        media_type="application/x-python-code", 
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
                "lastCheckedAt": c.lastCheckedAt.isoformat() if c.lastCheckedAt else None
            } for c in controls
        ]
    }
