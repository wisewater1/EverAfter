import hashlib
import hmac
import json
from datetime import datetime
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, desc
from app.models.audit import AuditLog
from app.core.config import settings
import logging

logger = logging.getLogger(__name__)

class LedgerService:
    def __init__(self, db: AsyncSession):
        self.db = db
        # We use a secure system key for HMAC signing the audit log (ledger)
        # Using Supabase service role key or a default
        self.signing_secret = getattr(settings, "VITE_SUPABASE_SERVICE_ROLE_KEY", "fallback_system_secret_key").encode()
        self.signer_id = "st_anthony_system"

    async def _get_previous_hash(self) -> str:
        """Fetch the chronologically previous AuditLog entry hash for Merkle chaining."""
        stmt = select(AuditLog.sha256).order_by(desc(AuditLog.ts)).limit(1)
        result = await self.db.execute(stmt)
        prev_hash = result.scalar_one_or_none()
        return prev_hash or "genesis_hash_0000000000000000"

    def _compute_entry_hash(self, prev_hash: str, ts: datetime, action: str, user_id: str, meta: dict) -> str:
        """Compute SHA256 spanning the previous hash and current event data."""
        payload = {
            "prevHash": prev_hash,
            "ts": ts.isoformat() if ts else "",
            "action": action,
            "userId": user_id or "system",
            "metadata": meta or {}
        }
        payload_str = json.dumps(payload, sort_keys=True)
        return hashlib.sha256(payload_str.encode("utf-8")).hexdigest()

    def _sign_hash(self, entry_hash: str) -> str:
        """Cryptographically sign the event hash."""
        signature = hmac.new(self.signing_secret, entry_hash.encode("utf-8"), hashlib.sha256).hexdigest()
        return signature

    async def log_event(self, action: str, user_id: str = None, provider: str = None, metadata: dict = None) -> AuditLog:
        """
        Record a cryptographically verifiable event in the database ledger.
        """
        try:
            prev_hash = await self._get_previous_hash()
            current_ts = datetime.utcnow()
            
            entry_hash = self._compute_entry_hash(prev_hash, current_ts, action, user_id, metadata)
            signature = self._sign_hash(entry_hash)

            new_log = AuditLog(
                userId=user_id,
                action=action,
                provider=provider,
                metadata_=metadata,
                ts=current_ts,
                sha256=entry_hash,
                prevHash=prev_hash,
                signature=signature,
                signerId=self.signer_id
            )

            self.db.add(new_log)
            await self.db.commit()
            await self.db.refresh(new_log)
            return new_log
        except Exception as e:
            logger.error(f"Failed to record verifiable audit log: {e}")
            await self.db.rollback()
            raise

    async def verify_ledger_integrity(self) -> dict:
        """
        Verify the mathematical integrity of the entire audit log chain.
        Returns a dict of { "is_valid": bool, "broken_at_id": str | None }
        """
        stmt = select(AuditLog).order_by(AuditLog.ts)
        result = await self.db.execute(stmt)
        logs = result.scalars().all()

        current_prev = "genesis_hash_0000000000000000"
        
        for log in logs:
            if log.prevHash != current_prev:
                return {"is_valid": False, "broken_at_id": log.id, "reason": "prevHash mismatch"}
            
            # Recompute expected hash
            expected_hash = self._compute_entry_hash(log.prevHash, log.ts, log.action, log.userId, log.metadata_)
            if log.sha256 and expected_hash != log.sha256:
                return {"is_valid": False, "broken_at_id": log.id, "reason": "Hash tampering detected"}
            
            # Recompute signature
            expected_signature = self._sign_hash(expected_hash)
            if log.signature and expected_signature != log.signature:
                return {"is_valid": False, "broken_at_id": log.id, "reason": "Signature tampering detected"}

            current_prev = log.sha256

        return {"is_valid": True, "broken_at_id": None, "reason": "OK"}
