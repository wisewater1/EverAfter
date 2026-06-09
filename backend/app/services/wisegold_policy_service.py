import hashlib
import json
from datetime import datetime, timedelta
from typing import Any, Dict, List, Optional
from uuid import UUID

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.finance import (
    SovereignCovenant,
    WiseGoldCovenantAttestation,
    WiseGoldPolicyState,
    WiseGoldSocialStanding,
    WiseGoldWallet,
)
from app.services.ledger_service import LedgerService
from app.services.saint_runtime import saint_runtime
from app.services.social_reputation_service import social_reputation_service


ALLOWED_BRIDGE_CHAINS = {"Arbitrum", "Polygon", "Base"}


class WiseGoldPolicyService:
    def __init__(self, session: AsyncSession):
        self.session = session

    def _parse_members(self, members_json: Optional[str]) -> List[Dict[str, Any]]:
        if not members_json:
            return []
        try:
            parsed = json.loads(members_json)
            return parsed if isinstance(parsed, list) else []
        except json.JSONDecodeError:
            return []

    def _covenant_key(self, covenant_id: UUID, user_id: str) -> str:
        payload = f"{covenant_id}:{user_id}".encode("utf-8")
        return "0x" + hashlib.sha256(payload).hexdigest()

    async def _get_policy_row(self) -> WiseGoldPolicyState:
        policy = (
            await self.session.execute(
                select(WiseGoldPolicyState).where(WiseGoldPolicyState.id == 1)
            )
        ).scalar_one_or_none()
        if not policy:
            policy = WiseGoldPolicyState(id=1)
            self.session.add(policy)
            await self.session.flush()
        return policy

    async def _get_wallet(self, user_id: str) -> Optional[WiseGoldWallet]:
        return (
            await self.session.execute(
                select(WiseGoldWallet).where(WiseGoldWallet.user_id == user_id)
            )
        ).scalar_one_or_none()

    async def _get_social_standing(self, user_id: str, wallet_address: Optional[str]) -> Dict[str, Any]:
        standing = await social_reputation_service.calculate_user_reputation(
            self.session,
            user_id,
            persist=True,
            wallet_address=wallet_address,
        )
        await self.session.flush()
        return standing

    async def sync_user_attestations(self, user_id: str, wallet_address: Optional[str] = None) -> List[WiseGoldCovenantAttestation]:
        covenants = (await self.session.execute(select(SovereignCovenant))).scalars().all()
        existing = (
            await self.session.execute(
                select(WiseGoldCovenantAttestation).where(WiseGoldCovenantAttestation.user_id == user_id)
            )
        ).scalars().all()
        existing_by_covenant = {str(att.covenant_id): att for att in existing}
        active_covenant_ids: set[str] = set()

        for covenant in covenants:
            members = self._parse_members(covenant.members)
            member_record = next((member for member in members if member.get("user_id") == user_id), None)
            if not member_record:
                continue

            active_covenant_ids.add(str(covenant.id))
            attestation = existing_by_covenant.get(str(covenant.id))
            expires_at = datetime.utcnow() + timedelta(days=30)
            metadata = {
                "covenant_name": covenant.name,
                "member_role": member_record.get("role", "member"),
                "member_status": member_record.get("status", "ACTIVE"),
                "member_display_name": member_record.get("display_name", "You"),
            }

            if not attestation:
                attestation = WiseGoldCovenantAttestation(
                    user_id=user_id,
                    covenant_id=covenant.id,
                    wallet_address=wallet_address,
                    attestation_type="BACKEND_COVENANT_MEMBERSHIP",
                    status="ACTIVE",
                    covenant_key=self._covenant_key(covenant.id, user_id),
                    proof_reference=f"backend-membership:{covenant.id}:{user_id}",
                    metadata_json=json.dumps(metadata),
                    issued_by="everafter_backend",
                    issued_at=datetime.utcnow(),
                    expires_at=expires_at,
                    last_verified_at=datetime.utcnow(),
                )
                self.session.add(attestation)
                existing_by_covenant[str(covenant.id)] = attestation
            else:
                attestation.status = "ACTIVE"
                attestation.wallet_address = wallet_address or attestation.wallet_address
                attestation.covenant_key = self._covenant_key(covenant.id, user_id)
                attestation.proof_reference = f"backend-membership:{covenant.id}:{user_id}"
                attestation.metadata_json = json.dumps(metadata)
                attestation.expires_at = expires_at
                attestation.last_verified_at = datetime.utcnow()

        for covenant_id, attestation in existing_by_covenant.items():
            if covenant_id not in active_covenant_ids:
                attestation.status = "INACTIVE"
                attestation.last_verified_at = datetime.utcnow()

        await self.session.flush()
        return list(existing_by_covenant.values())

    async def get_user_attestations(self, user_id: str, wallet_address: Optional[str] = None) -> List[Dict[str, Any]]:
        attestations = await self.sync_user_attestations(user_id, wallet_address=wallet_address)
        out: List[Dict[str, Any]] = []
        for attestation in attestations:
            metadata = json.loads(attestation.metadata_json or "{}")
            out.append({
                "id": str(attestation.id),
                "covenant_id": str(attestation.covenant_id),
                "covenant_key": attestation.covenant_key,
                "covenant_name": metadata.get("covenant_name"),
                "status": attestation.status,
                "attestation_type": attestation.attestation_type,
                "wallet_address": attestation.wallet_address,
                "issued_at": attestation.issued_at.isoformat() if attestation.issued_at else None,
                "expires_at": attestation.expires_at.isoformat() if attestation.expires_at else None,
                "last_verified_at": attestation.last_verified_at.isoformat() if attestation.last_verified_at else None,
                "metadata": metadata,
            })
        return out

    def _compute_limit(self, action: str, policy: WiseGoldPolicyState, standing: Dict[str, Any]) -> float:
        reputation_factor = 0.75 + max(0.0, min(1.0, float(standing.get("normalized_score", 0.5)))) * 0.9
        stress_norm = max(0.0, min(1.0, float(policy.stress_level or 0.0) / 10.0))
        stress_factor = max(0.35, 1.0 - (stress_norm * 0.55))
        pool_size = max(float(policy.daily_manna_pool or 0.0), 1.0)
        velocity_ratio = min(float(policy.last_tick_velocity or 0.0) / pool_size, 1.5)
        velocity_factor = max(0.5, 1.0 - velocity_ratio * 0.25)

        if action == "mint":
            base_limit = max(float(policy.current_base_manna or 0.0) * 250.0, pool_size * 0.005)
        elif action == "withdraw":
            base_limit = max(float(policy.current_base_manna or 0.0) * 500.0, pool_size * 0.02)
        elif action == "bridge":
            base_limit = max(float(policy.current_base_manna or 0.0) * 300.0, pool_size * 0.015)
        else:
            base_limit = max(float(policy.current_base_manna or 0.0) * 100.0, 25.0)

        return round(base_limit * reputation_factor * stress_factor * velocity_factor, 4)

    async def evaluate_action(
        self,
        *,
        user_id: str,
        action: str,
        amount: float,
        covenant_id: Optional[UUID] = None,
        destination_chain: Optional[str] = None,
        wallet_address: Optional[str] = None,
    ) -> Dict[str, Any]:
        policy = await self._get_policy_row()
        wallet = await self._get_wallet(user_id)
        standing = await self._get_social_standing(user_id, wallet_address or (wallet.solana_pubkey if wallet else None))
        attestations = await self.sync_user_attestations(user_id, wallet_address=wallet_address or (wallet.solana_pubkey if wallet else None))

        active_attestations = [att for att in attestations if att.status == "ACTIVE"]
        matching_attestation = None
        if covenant_id:
            matching_attestation = next((att for att in active_attestations if att.covenant_id == covenant_id), None)
        elif active_attestations:
            matching_attestation = active_attestations[0]

        effective_limit = self._compute_limit(action, policy, standing)
        reasons: List[str] = []
        reason_code = "ALLOW"
        allowed = True

        if action in {"mint", "withdraw", "bridge"} and not matching_attestation:
            allowed = False
            reason_code = "ATTESTATION_REQUIRED"
            reasons.append("No active covenant attestation is available for this wallet.")

        if action == "bridge" and destination_chain and destination_chain not in ALLOWED_BRIDGE_CHAINS:
            allowed = False
            reason_code = "DESTINATION_NOT_APPROVED"
            reasons.append(f"{destination_chain} is not an approved WGOLD bridge destination.")

        if action in {"mint", "withdraw", "bridge"} and amount > effective_limit:
            allowed = False
            reason_code = "LIMIT_EXCEEDED"
            reasons.append(f"Requested amount exceeds the current {action} limit of {effective_limit:.2f} WGOLD.")

        if float(policy.stress_level or 0.0) >= 9.0 and action in {"withdraw", "bridge"}:
            allowed = False
            reason_code = "TREASURY_STRESS_LOCK"
            reasons.append("Treasury stress is too high for external exits right now.")

        summary = {
            "allowed": allowed,
            "reason_code": reason_code,
            "reason": " ".join(reasons) if reasons else f"{action.title()} is allowed under the current covenant and treasury policy.",
            "effective_limit": effective_limit,
            "attested": matching_attestation is not None,
            "attestation_count": len(active_attestations),
            "attestation": None,
            "social_standing": {
                "tier": standing.get("tier"),
                "reputation_bps": standing.get("reputation_bps"),
                "normalized_score": standing.get("normalized_score"),
                "daily_manna_multiplier_bps": standing.get("daily_manna_multiplier_bps"),
                "governance_weight_bps": standing.get("governance_weight_bps"),
            },
            "policy": {
                "current_tax_rate": float(policy.current_tax_rate or 0.0),
                "current_base_manna": float(policy.current_base_manna or 0.0),
                "daily_manna_pool": float(policy.daily_manna_pool or 0.0),
                "total_circulating": float(policy.total_circulating or 0.0),
                "stress_level": float(policy.stress_level or 0.0),
                "last_tick_velocity": float(policy.last_tick_velocity or 0.0),
                "last_gold_delta": float(policy.last_gold_delta or 0.0),
                "last_tick_at": policy.last_tick_at.isoformat() if policy.last_tick_at else None,
            },
        }

        if matching_attestation:
            summary["attestation"] = {
                "covenant_id": str(matching_attestation.covenant_id),
                "covenant_key": matching_attestation.covenant_key,
                "status": matching_attestation.status,
                "expires_at": matching_attestation.expires_at.isoformat() if matching_attestation.expires_at else None,
            }

        return summary

    async def get_policy_summary(self, user_id: str, wallet_address: Optional[str] = None) -> Dict[str, Any]:
        mint = await self.evaluate_action(user_id=user_id, action="mint", amount=0.0, wallet_address=wallet_address)
        withdraw = await self.evaluate_action(user_id=user_id, action="withdraw", amount=0.0, wallet_address=wallet_address)
        bridge = await self.evaluate_action(user_id=user_id, action="bridge", amount=0.0, destination_chain="Arbitrum", wallet_address=wallet_address)

        return {
            "attestation_status": {
                "active": withdraw["attested"],
                "count": withdraw["attestation_count"],
            },
            "limits": {
                "mint": mint["effective_limit"],
                "withdraw": withdraw["effective_limit"],
                "bridge": bridge["effective_limit"],
            },
            "actions": {
                "mint": mint,
                "withdraw": withdraw,
                "bridge": bridge,
            },
        }

    async def record_policy_decision(
        self,
        *,
        user_id: str,
        action: str,
        allowed: bool,
        amount: float,
        reason: str,
        metadata: Optional[Dict[str, Any]] = None,
    ) -> None:
        action_name = "wisegold_policy_allowed" if allowed else "wisegold_policy_denied"
        ledger = LedgerService(self.session)
        payload = {
            "action_type": action,
            "allowed": allowed,
            "amount": amount,
            "reason": reason,
            **(metadata or {}),
        }
        await ledger.log_event(action=action_name, user_id=user_id, provider="wisegold_policy", metadata=payload)

        severity = 8.0 if allowed else 9.5
        description = f"WGOLD policy {'approved' if allowed else 'denied'} {action} for {user_id}: {reason}"
        await saint_runtime.handle_system_event("anthony", description, importance=severity)
        await saint_runtime.handle_system_event("michael", description, importance=severity - 0.5)
