import json
import logging
import random
from datetime import datetime, timedelta
from typing import Any, Dict, Optional, Tuple

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.finance import (
    LivingWill,
    RitualBondNFT,
    WiseGoldLedgerEntry,
    WiseGoldPolicyState,
    WiseGoldWallet,
)
from app.services.social_reputation_service import social_reputation_service

logger = logging.getLogger(__name__)

TARGET_MANNA_POOL = 50000.0


class AISentientPolicy:
    """Evaluates stress and sets tax/mint policy for the WiseGold economy."""

    def __init__(self) -> None:
        self.target_pool_size = TARGET_MANNA_POOL
        self.current_stress_level = 0.0

    def analyze_and_adjust(self, pool_size: float, velocity_24h: float, gold_delta: float) -> Tuple[float, float]:
        if pool_size < self.target_pool_size * 0.5:
            self.current_stress_level = 5.0
        elif gold_delta < -5.0:
            self.current_stress_level = 8.0
        elif velocity_24h > self.target_pool_size * 0.35:
            self.current_stress_level = 4.0
        else:
            self.current_stress_level = 1.0

        velocity_tax = 0.005
        mint_rate = 0.5

        if self.current_stress_level > 5:
            velocity_tax = 0.01
            mint_rate = 0.3
        elif self.current_stress_level < 2:
            velocity_tax = 0.003
            mint_rate = 0.6

        return velocity_tax, mint_rate


class GoldenSovereignEngine:
    """
    Authoritative WiseGold engine for policy, manna issuance, and legacy handling.
    """

    def __init__(self, session: AsyncSession):
        self.session = session
        self.daily_manna_pool = 35762.61
        self.total_circulating = 1045260.91
        self.last_gold_price = 72.00
        self.current_tax_rate = 0.005
        self.current_base_manna = 0.5
        self.last_tick_at: Optional[datetime] = None
        self.ai_policy = AISentientPolicy()

    async def _execute_omnichain_transaction(self, chain_target: str, action: str, amount: float, wallet_id: str) -> bool:
        network_health = {
            "Arbitrum": 0.95,
            "Polygon": 0.99,
            "Base": 0.99,
        }
        success = random.random() < network_health.get(chain_target, 0.90)
        if success:
            logger.info("[WiseGold] %s %.4f WGOLD executed on %s for wallet %s", action, amount, chain_target, wallet_id)
        else:
            logger.warning("[WiseGold] %s failed on %s for wallet %s", action, chain_target, wallet_id)
        return success

    async def execute_with_failover(self, action: str, amount: float, wallet_id: str) -> bool:
        for chain in ("Arbitrum", "Polygon", "Base"):
            if await self._execute_omnichain_transaction(chain, action, amount, wallet_id):
                return True
        logger.error("[WiseGold] all failover chains failed for %s on wallet %s", action, wallet_id)
        return False

    async def _get_policy_state(self) -> WiseGoldPolicyState:
        policy = (await self.session.execute(
            select(WiseGoldPolicyState).where(WiseGoldPolicyState.id == 1)
        )).scalar_one_or_none()
        if not policy:
            policy = WiseGoldPolicyState(id=1)
            self.session.add(policy)
            await self.session.flush()
        return policy

    async def _hydrate_from_policy(self) -> WiseGoldPolicyState:
        policy = await self._get_policy_state()
        self.daily_manna_pool = float(policy.daily_manna_pool or self.daily_manna_pool)
        self.total_circulating = float(policy.total_circulating or self.total_circulating)
        self.last_gold_price = float(policy.last_gold_price or self.last_gold_price)
        self.current_tax_rate = float(policy.current_tax_rate or self.current_tax_rate)
        self.current_base_manna = float(policy.current_base_manna or self.current_base_manna)
        self.last_tick_at = policy.last_tick_at
        self.ai_policy.current_stress_level = float(policy.stress_level or 0.0)
        return policy

    async def _persist_policy(
        self,
        policy: WiseGoldPolicyState,
        *,
        velocity_24h: float,
        gold_delta: float,
    ) -> None:
        policy.current_tax_rate = self.current_tax_rate
        policy.current_base_manna = self.current_base_manna
        policy.daily_manna_pool = self.daily_manna_pool
        policy.total_circulating = self.total_circulating
        policy.last_gold_price = self.last_gold_price
        policy.stress_level = self.ai_policy.current_stress_level
        policy.last_tick_velocity = velocity_24h
        policy.last_gold_delta = gold_delta
        policy.last_tick_at = datetime.utcnow()

    async def _record_entry(
        self,
        *,
        user_id: str,
        wallet: Optional[WiseGoldWallet],
        entry_type: str,
        direction: str,
        amount: float,
        description: str,
        balance_after: Optional[float] = None,
        status: str = "COMPLETED",
        metadata: Optional[Dict[str, Any]] = None,
    ) -> None:
        self.session.add(WiseGoldLedgerEntry(
            user_id=user_id,
            wallet_id=wallet.id if wallet else None,
            entry_type=entry_type,
            direction=direction,
            amount=amount,
            balance_after=balance_after,
            status=status,
            description=description,
            metadata_json=json.dumps(metadata or {}),
        ))

    async def _get_bond_for_wallet(self, wallet_id) -> Optional[RitualBondNFT]:
        return (await self.session.execute(
            select(RitualBondNFT).where(RitualBondNFT.wallet_id == wallet_id)
        )).scalar_one_or_none()

    async def process_legacy_protocol(self) -> Dict[str, float]:
        one_year_ago = datetime.utcnow() - timedelta(days=365)
        wills = (await self.session.execute(
            select(LivingWill).where(
                LivingWill.status != "HISTORICAL",
                LivingWill.last_heartbeat < one_year_ago,
            )
        )).scalars().all()

        reclaimed_total = 0.0
        impacted_wallets = 0

        for will in wills:
            wallet = await self.session.get(WiseGoldWallet, will.wallet_id)
            if not wallet or float(wallet.balance or 0.0) <= 0:
                continue

            current_balance = float(wallet.balance or 0.0)
            pool_return = round(current_balance * 0.5, 4)
            heir_return = round(current_balance - pool_return, 4)

            await self.execute_with_failover("Legacy_Distribution", current_balance, str(wallet.id))

            will.status = "HISTORICAL"
            wallet.balance = 0.0
            self.daily_manna_pool += pool_return
            self.total_circulating = max(0.0, self.total_circulating - current_balance)
            reclaimed_total += pool_return
            impacted_wallets += 1

            await self._record_entry(
                user_id=wallet.user_id,
                wallet=wallet,
                entry_type="LEGACY_REDISTRIBUTION",
                direction="debit",
                amount=current_balance,
                balance_after=0.0,
                description="Legacy protocol executed after extended inactivity.",
                metadata={
                    "reclaimed_to_pool": pool_return,
                    "reserved_for_heirs": heir_return,
                },
            )

        return {
            "reclaimed_to_pool": reclaimed_total,
            "impacted_wallets": impacted_wallets,
        }

    async def distribute_living_manna(self) -> Dict[str, float]:
        wallets = (await self.session.execute(
            select(WiseGoldWallet).join(LivingWill).where(LivingWill.status == "ACTIVE")
        )).scalars().all()

        total_outflow = 0.0
        recipient_count = 0

        for wallet in wallets:
            if self.daily_manna_pool <= 0:
                break

            bond = await self._get_bond_for_wallet(wallet.id)
            ritual_boost = float(bond.multiplier or 1.0) if bond else 1.0
            social_standing = await social_reputation_service.calculate_user_reputation(
                self.session,
                wallet.user_id,
                persist=True,
                wallet_address=wallet.solana_pubkey,
            )
            social_boost = float(social_standing["daily_manna_multiplier_bps"]) / 10000.0
            final_amount = round(self.current_base_manna * ritual_boost * social_boost, 4)
            final_amount = min(final_amount, self.daily_manna_pool)

            if final_amount <= 0:
                continue

            await self.execute_with_failover("Manna_Distribution", final_amount, str(wallet.id))

            wallet.balance = float(wallet.balance or 0.0) + final_amount
            wallet.last_manna_claim = datetime.utcnow()
            self.daily_manna_pool = max(0.0, self.daily_manna_pool - final_amount)
            self.total_circulating += final_amount
            total_outflow += final_amount
            recipient_count += 1

            await self._record_entry(
                user_id=wallet.user_id,
                wallet=wallet,
                entry_type="MANNA_DISTRIBUTION",
                direction="credit",
                amount=final_amount,
                balance_after=float(wallet.balance or 0.0),
                description="Daily manna distribution applied.",
                metadata={
                    "ritual_multiplier": ritual_boost,
                    "social_multiplier": social_boost,
                    "reputation_bps": social_standing["reputation_bps"],
                    "community_tier": social_standing["tier"],
                },
            )

        return {
            "distributed": total_outflow,
            "recipients": recipient_count,
        }

    async def system_tick(self, velocity_24h: float, latest_gold_price: float) -> Dict[str, Any]:
        policy = await self._hydrate_from_policy()
        gold_delta = round(float(latest_gold_price) - float(self.last_gold_price or 0.0), 4)

        legacy = await self.process_legacy_protocol()

        self.last_gold_price = float(latest_gold_price)
        self.current_tax_rate, self.current_base_manna = self.ai_policy.analyze_and_adjust(
            self.daily_manna_pool,
            velocity_24h,
            gold_delta,
        )

        distribution = await self.distribute_living_manna()
        await self._persist_policy(policy, velocity_24h=velocity_24h, gold_delta=gold_delta)
        await self.session.commit()

        return {
            "success": True,
            "policy": {
                "current_tax_rate": self.current_tax_rate,
                "current_base_manna": self.current_base_manna,
                "daily_manna_pool": self.daily_manna_pool,
                "total_circulating": self.total_circulating,
                "last_gold_price": self.last_gold_price,
                "stress_level": self.ai_policy.current_stress_level,
                "last_tick_at": policy.last_tick_at.isoformat() if policy.last_tick_at else None,
            },
            "velocity_24h": velocity_24h,
            "gold_delta": gold_delta,
            "legacy": legacy,
            "distribution": distribution,
        }
