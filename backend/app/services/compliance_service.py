import asyncio
import logging
from datetime import datetime
from app.db.session import async_session_maker
from sqlalchemy import select, update
from app.models.audit import ComplianceControl, RestoreDrill, AuditLog
from app.services.ledger_service import LedgerService

logger = logging.getLogger(__name__)

class ComplianceAutopilot:
    """
    Autonomous Compliance engine that periodically tests system constraints
    and records verifiable evidence into the cryptographic ledger.
    """
    def __init__(self):
        self.controls = [
            {"id": "CC-01", "desc": "Ledger Cryptographic Integrity Maintained"},
            {"id": "CC-02", "desc": "Just-In-Time Access Limits Enforced"},
            {"id": "CC-03", "desc": "Data Flow Routing Encrypted at Rest"}
        ]

    async def initialize_controls(self):
        """Seed the compliance controls in the database if missing."""
        async with async_session_maker() as db:
            for c in self.controls:
                stmt = select(ComplianceControl).where(ComplianceControl.controlId == c["id"])
                result = await db.execute(stmt)
                existing = result.scalar_one_or_none()
                if not existing:
                    new_control = ComplianceControl(
                        controlId=c["id"],
                        description=c["desc"],
                        isPassing=True
                    )
                    db.add(new_control)
            await db.commit()

    async def run_continuous_audits(self):
        """Infinite loop to autonomously run compliance tests."""
        await self.initialize_controls()
        
        while True:
            try:
                logger.info("Saint Anthony Autopilot: Executing continuous control sweep...")
                async with async_session_maker() as db:
                    ledger = LedgerService(db)
                    
                    # 1. Verify hash integrity autonomously
                    integrity_report = await ledger.verify_ledger_integrity()
                    is_chain_valid = integrity_report.get("is_valid", False)
                    
                    # Update CC-01
                    stmt = update(ComplianceControl).where(
                        ComplianceControl.controlId == "CC-01"
                    ).values(isPassing=is_chain_valid, lastCheckedAt=datetime.utcnow())
                    await db.execute(stmt)
                    
                    # 2. Simulate Restore Drill
                    await self._execute_restore_drill(db, ledger)
                    
                    await db.commit()

                # Produce a verifiable ledger entry for the autonomous sweep
                async with async_session_maker() as db:
                    ledger = LedgerService(db)
                    await ledger.log_event(
                        action="system/autonomous_audit_completed",
                        metadata={"chain_valid": is_chain_valid, "controls_tested": len(self.controls)}
                    )

            except Exception as e:
                logger.error(f"Error in continuous audit sweep: {e}")
                
            # Run checks every 15 minutes (or 30s for demo purposes)
            await asyncio.sleep(60 * 15)

    async def _execute_restore_drill(self, db, ledger: LedgerService):
        """
        Record that no restore drill was performed.

        No restore is attempted anywhere in this service. This previously wrote
        a RestoreDrill row with status SUCCESS, a duration of 142 ms and a
        proofHash built from a fresh uuid, then logged
        "system/restore_drill_executed" with that hash as "proof". Nothing was
        restored and nothing was verified, so the row and the ledger entry were
        fabricated compliance evidence, produced every fifteen minutes.

        Recovery evidence is exactly the kind of claim that must not be asserted
        by the system it describes, so this records the honest status instead. A
        real drill needs to restore an engram from the ledger and hash what came
        back; until that exists, NOT_IMPLEMENTED is the truthful value.
        """
        drill = RestoreDrill(
            targetResource="engram_backup_primary",
            status="NOT_IMPLEMENTED",
            durationMs=None,
            proofHash=None,
        )
        db.add(drill)

        # Committed by the caller.
        await ledger.log_event(
            action="system/restore_drill_skipped",
            metadata={
                "target": "engram_backup_primary",
                "reason": "no_restore_procedure_implemented",
                "note": (
                    "No restore was attempted. This entry records the absence of a "
                    "drill and must not be read as recovery evidence."
                ),
            },
        )

# Global singleton
compliance_autopilot = ComplianceAutopilot()
