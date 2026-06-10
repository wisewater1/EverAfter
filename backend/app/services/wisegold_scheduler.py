import asyncio
import logging
from datetime import datetime, timedelta
from typing import Optional

from sqlalchemy import select
from sqlalchemy.ext.asyncio import async_sessionmaker

from app.core.config import settings
from app.db.session import Base, get_engine, get_session_factory
from app.models.finance import (
    LivingWill,
    RitualBondNFT,
    SovereignCovenant,
    WiseGoldLedgerEntry,
    WiseGoldPolicyState,
    WiseGoldSocialStanding,
    WiseGoldCovenantAttestation,
    WiseGoldWallet,
)

logger = logging.getLogger(__name__)

WISEGOLD_TABLES = [
    WiseGoldWallet.__table__,
    RitualBondNFT.__table__,
    LivingWill.__table__,
    SovereignCovenant.__table__,
    WiseGoldLedgerEntry.__table__,
    WiseGoldPolicyState.__table__,
    WiseGoldSocialStanding.__table__,
    WiseGoldCovenantAttestation.__table__,
]


async def ensure_wisegold_tables() -> None:
    engine = get_engine()
    async with engine.begin() as conn:
        await conn.run_sync(lambda sync_conn: Base.metadata.create_all(sync_conn, tables=WISEGOLD_TABLES))


class WiseGoldScheduler:
    def __init__(self):
        self.session_factory: Optional[async_sessionmaker] = None
        self.tick_interval = timedelta(hours=settings.WISEGOLD_TICK_INTERVAL_HOURS)

    def _get_session_factory(self) -> async_sessionmaker:
        if self.session_factory is None:
            self.session_factory = get_session_factory()
        return self.session_factory

    async def tick_if_due(self, force: bool = False):
        session_factory = self._get_session_factory()
        async with session_factory() as session:
            policy = (await session.execute(
                select(WiseGoldPolicyState).where(WiseGoldPolicyState.id == 1)
            )).scalar_one_or_none()

            due = (
                force
                or policy is None
                or policy.last_tick_at is None
                or datetime.utcnow() - policy.last_tick_at >= self.tick_interval
            )

            if not due:
                return None

            from app.services.finance_service import FinanceService

            service = FinanceService(session)
            result = await service.run_wisegold_tick()
            logger.info("[WiseGold] scheduled tick complete")
            return result

    async def run_forever(self):
        while True:
            try:
                await self.tick_if_due()
            except asyncio.CancelledError:
                raise
            except Exception:
                logger.exception("[WiseGold] scheduled tick failed")
            await asyncio.sleep(settings.WISEGOLD_TICK_CHECK_SECONDS)


wisegold_scheduler = WiseGoldScheduler()
