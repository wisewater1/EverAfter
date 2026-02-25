import logging
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from app.models.saint import IntegrityHistory
from datetime import datetime, timedelta
import uuid

logger = logging.getLogger(__name__)

class IntegrityService:
    """
    Manages the calculation and storage of security integrity dividends.
    """

    async def record_daily_score(self, session: AsyncSession, user_id: str, score: float, findings_count: int):
        """
        Records a daily integrity score and calculates the incremental dividend.
        """
        user_uuid = uuid.UUID(user_id) if isinstance(user_id, str) else user_id
        
        # Calculate daily dividend incremental
        # Baseline: $0.10 per day for perfect score (100 or 1.0)
        # Scaled by score (0 to 100)
        daily_baseline = 0.10
        daily_dividend = (score / 100.0) * daily_baseline if score > 0 else 0
        
        # Penalize for findings
        if findings_count > 0:
            daily_dividend = max(0.0, daily_dividend - (findings_count * 0.02))

        new_entry = IntegrityHistory(
            user_id=user_uuid,
            score=score,
            findings_count=findings_count,
            dividend_accumulated=daily_dividend
        )
        
        session.add(new_entry)
        await session.commit()
        logger.info(f"IntegrityService: Recorded score {score} for {user_id}. Dividend: ${daily_dividend:.2f}")

    async def get_total_dividend(self, session: AsyncSession, user_id: str) -> float:
        """
        Returns the total accumulated dividend for a user.
        """
        user_uuid = uuid.UUID(user_id) if isinstance(user_id, str) else user_id
        stmt = select(func.sum(IntegrityHistory.dividend_accumulated)).where(IntegrityHistory.user_id == user_uuid)
        result = await session.execute(stmt)
        return result.scalar() or 0.0

    async def get_recent_history(self, session: AsyncSession, user_id: str, days: int = 7):
        """
        Returns recent integrity history.
        """
        user_uuid = uuid.UUID(user_id) if isinstance(user_id, str) else user_id
        cutoff = datetime.now() - timedelta(days=days)
        stmt = select(IntegrityHistory).where(
            IntegrityHistory.user_id == user_uuid,
            IntegrityHistory.created_at >= cutoff
        ).order_by(IntegrityHistory.created_at.desc())
        
        result = await session.execute(stmt)
        return result.scalars().all()

# Singleton
integrity_service = IntegrityService()
