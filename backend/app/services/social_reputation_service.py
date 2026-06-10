import math
import uuid
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional, Set

from sqlalchemy import or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.engram import Engram
from app.models.finance import WiseGoldSocialStanding
from app.models.interaction import AgentInteraction


def _clamp(value: float, lower: float, upper: float) -> float:
    return max(lower, min(upper, value))


class SocialReputationService:
    """
    Computes how a user's engrams are perceived by the wider social graph and
    normalizes that into a WGOLD-compatible reputation score.
    """

    @staticmethod
    def _parse_user_uuid(user_id: str) -> Optional[uuid.UUID]:
        try:
            return uuid.UUID(str(user_id))
        except (TypeError, ValueError, AttributeError):
            return None

    @staticmethod
    def _to_utc(value: Optional[datetime]) -> Optional[datetime]:
        if value is None:
            return None
        if value.tzinfo is None:
            return value.replace(tzinfo=timezone.utc)
        return value.astimezone(timezone.utc)

    @staticmethod
    def _sentiment_to_unit(value: Optional[float]) -> float:
        return _clamp(((float(value or 0.0) + 1.0) / 2.0), 0.0, 1.0)

    @staticmethod
    def _recency_weight(value: Optional[datetime]) -> float:
        dt = SocialReputationService._to_utc(value)
        if not dt:
            return 0.35
        age_days = max(0.0, (datetime.now(timezone.utc) - dt).total_seconds() / 86400.0)
        # Recent interactions matter more, but historical reputation should not vanish.
        return _clamp(math.exp(-age_days / 45.0), 0.35, 1.0)

    @staticmethod
    def _tier_from_bps(score_bps: int) -> str:
        if score_bps >= 8500:
            return "Revered"
        if score_bps >= 7000:
            return "Trusted"
        if score_bps >= 5500:
            return "Recognized"
        if score_bps >= 4000:
            return "Emerging"
        return "Fractured"

    @staticmethod
    def _neutral_snapshot(user_id: str, *, reason: str) -> Dict[str, Any]:
        return {
            "user_id": user_id,
            "reputation_bps": 5000,
            "normalized_score": 0.5,
            "daily_manna_multiplier_bps": 10000,
            "governance_weight_bps": 10000,
            "tier": "Recognized",
            "total_interactions": 0,
            "distinct_peers": 0,
            "reciprocal_peers": 0,
            "inbound_sentiment_avg": 0.5,
            "inbound_rapport_avg": 0.5,
            "outbound_sentiment_avg": 0.5,
            "reason": reason,
            "last_calculated_at": datetime.utcnow().isoformat(),
        }

    async def _get_or_create_row(self, session: AsyncSession, user_id: str) -> WiseGoldSocialStanding:
        row = (await session.execute(
            select(WiseGoldSocialStanding).where(WiseGoldSocialStanding.user_id == user_id)
        )).scalar_one_or_none()
        if not row:
            row = WiseGoldSocialStanding(user_id=user_id)
            session.add(row)
            await session.flush()
        return row

    async def calculate_user_reputation(
        self,
        session: AsyncSession,
        user_id: str,
        *,
        persist: bool = True,
        wallet_address: Optional[str] = None,
    ) -> Dict[str, Any]:
        user_uuid = self._parse_user_uuid(user_id)
        if not user_uuid:
            snapshot = self._neutral_snapshot(user_id, reason="user-id-not-uuid")
            if persist:
                row = await self._get_or_create_row(session, user_id)
                self._apply_snapshot_to_row(row, snapshot, wallet_address=wallet_address)
                await session.flush()
            return snapshot

        engrams = (await session.execute(
            select(Engram.id).where(Engram.user_id == user_uuid)
        )).scalars().all()

        user_engram_ids: Set[Any] = set(engrams)
        if not user_engram_ids:
            snapshot = self._neutral_snapshot(user_id, reason="no-engrams")
            if persist:
                row = await self._get_or_create_row(session, user_id)
                self._apply_snapshot_to_row(row, snapshot, wallet_address=wallet_address)
                await session.flush()
            return snapshot

        interactions = (await session.execute(
            select(AgentInteraction).where(
                or_(
                    AgentInteraction.initiator_id.in_(list(user_engram_ids)),
                    AgentInteraction.receiver_id.in_(list(user_engram_ids)),
                )
            )
        )).scalars().all()

        if not interactions:
            snapshot = self._neutral_snapshot(user_id, reason="no-interactions")
            if persist:
                row = await self._get_or_create_row(session, user_id)
                self._apply_snapshot_to_row(row, snapshot, wallet_address=wallet_address)
                await session.flush()
            return snapshot

        inbound_weight = 0.0
        inbound_sentiment = 0.0
        inbound_rapport = 0.0
        outbound_weight = 0.0
        outbound_sentiment = 0.0
        total_weight = 0.0
        total_interactions = 0
        peer_ids: Set[Any] = set()
        inbound_peers: Set[Any] = set()
        outbound_peers: Set[Any] = set()

        for interaction in interactions:
            initiator_is_user = interaction.initiator_id in user_engram_ids
            receiver_is_user = interaction.receiver_id in user_engram_ids
            if not initiator_is_user and not receiver_is_user:
                continue

            total_interactions += 1
            weight = self._recency_weight(interaction.created_at)
            sentiment_unit = self._sentiment_to_unit(interaction.sentiment_score)
            rapport_unit = _clamp(float(interaction.emotional_rapport or 0.0), 0.0, 1.0)
            total_weight += weight

            if receiver_is_user and interaction.initiator_id not in user_engram_ids:
                peer_ids.add(interaction.initiator_id)
                inbound_peers.add(interaction.initiator_id)
                inbound_weight += weight
                inbound_sentiment += sentiment_unit * weight
                inbound_rapport += rapport_unit * weight

            if initiator_is_user and interaction.receiver_id not in user_engram_ids:
                peer_ids.add(interaction.receiver_id)
                outbound_peers.add(interaction.receiver_id)
                outbound_weight += weight
                outbound_sentiment += sentiment_unit * weight

        inbound_sentiment_avg = (inbound_sentiment / inbound_weight) if inbound_weight else 0.5
        inbound_rapport_avg = (inbound_rapport / inbound_weight) if inbound_weight else 0.5
        outbound_sentiment_avg = (outbound_sentiment / outbound_weight) if outbound_weight else 0.5
        reciprocity = (len(inbound_peers & outbound_peers) / len(peer_ids)) if peer_ids else 0.0
        reach = _clamp(len(peer_ids) / 12.0, 0.0, 1.0)
        activity = _clamp(total_interactions / 24.0, 0.0, 1.0)
        inbound_presence = _clamp(inbound_weight / total_weight, 0.0, 1.0) if total_weight else 0.5

        normalized_score = (
            inbound_sentiment_avg * 0.34
            + inbound_rapport_avg * 0.28
            + reciprocity * 0.16
            + reach * 0.12
            + activity * 0.10
        )
        if inbound_presence < 0.25:
            normalized_score *= 0.92

        normalized_score = _clamp(normalized_score, 0.0, 1.0)
        reputation_bps = int(round(normalized_score * 10000))
        daily_manna_multiplier_bps = int(round(_clamp(7000 + (normalized_score * 8000), 7000, 15000)))
        governance_weight_bps = int(round(_clamp(8000 + (normalized_score * 5000), 8000, 13000)))

        snapshot = {
            "user_id": user_id,
            "reputation_bps": reputation_bps,
            "normalized_score": normalized_score,
            "daily_manna_multiplier_bps": daily_manna_multiplier_bps,
            "governance_weight_bps": governance_weight_bps,
            "tier": self._tier_from_bps(reputation_bps),
            "total_interactions": total_interactions,
            "distinct_peers": len(peer_ids),
            "reciprocal_peers": len(inbound_peers & outbound_peers),
            "inbound_sentiment_avg": inbound_sentiment_avg,
            "inbound_rapport_avg": inbound_rapport_avg,
            "outbound_sentiment_avg": outbound_sentiment_avg,
            "last_calculated_at": datetime.utcnow().isoformat(),
        }

        if persist:
            row = await self._get_or_create_row(session, user_id)
            self._apply_snapshot_to_row(row, snapshot, wallet_address=wallet_address)
            await session.flush()

        return snapshot

    def _apply_snapshot_to_row(
        self,
        row: WiseGoldSocialStanding,
        snapshot: Dict[str, Any],
        *,
        wallet_address: Optional[str] = None,
    ) -> None:
        row.reputation_bps = int(snapshot["reputation_bps"])
        row.normalized_score = float(snapshot["normalized_score"])
        row.daily_manna_multiplier_bps = int(snapshot["daily_manna_multiplier_bps"])
        row.governance_weight_bps = int(snapshot["governance_weight_bps"])
        row.total_interactions = int(snapshot["total_interactions"])
        row.distinct_peers = int(snapshot["distinct_peers"])
        row.reciprocal_peers = int(snapshot["reciprocal_peers"])
        row.inbound_sentiment_avg = float(snapshot["inbound_sentiment_avg"])
        row.inbound_rapport_avg = float(snapshot["inbound_rapport_avg"])
        row.outbound_sentiment_avg = float(snapshot["outbound_sentiment_avg"])
        row.last_calculated_at = datetime.utcnow()
        if wallet_address:
            row.last_synced_wallet_address = wallet_address


social_reputation_service = SocialReputationService()
