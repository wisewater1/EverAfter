from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, update
from app.db.session import get_session
from app.models.engram import DailyQuestionResponse
from app.api.auth_utils import get_current_user_id
import logging

router = APIRouter()
logger = logging.getLogger(__name__)

@router.get("/assets/mining")
async def get_mineable_engrams(
    db: AsyncSession = Depends(get_session),
    user_id: str = Depends(get_current_user_id)
):
    """Returns engrams that the user has permitted for training/mining."""
    try:
        stmt = select(DailyQuestionResponse).where(
            DailyQuestionResponse.user_id == user_id,
            DailyQuestionResponse.training_permitted == True
        )
        result = await db.execute(stmt)
        engrams = result.scalars().all()
        return engrams
    except Exception as e:
        logger.error(f"Error fetching mineable engrams: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/assets/mining/{engram_id}/permit")
async def permit_engram_training(
    engram_id: str,
    permit: bool = True,
    db: AsyncSession = Depends(get_session),
    user_id: str = Depends(get_current_user_id)
):
    """Sets the training_permitted flag on a specific engram."""
    try:
        stmt = update(DailyQuestionResponse).where(
            DailyQuestionResponse.id == engram_id,
            DailyQuestionResponse.user_id == user_id
        ).values(training_permitted=permit)
        
        await db.execute(stmt)
        await db.commit()
        return {"status": "success", "permitted": permit}
    except Exception as e:
        logger.error(f"Error permitting engram: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/assets/marketplace")
async def get_marketplace_training_assets(
    db: AsyncSession = Depends(get_session)
):
    """Public endpoint for other creators to find available training engrams."""
    try:
        # Returns anonymized counts or snippets for marketplace listing
        stmt = select(DailyQuestionResponse).where(
            DailyQuestionResponse.training_permitted == True
        ).limit(100)
        result = await db.execute(stmt)
        assets = result.scalars().all()
        
        # Anonymize
        return [
            {
                "id": str(a.id),
                "category": a.question_category,
                "importance_score": 0.85, # Mock importance derived from content
                "price_credits": 10
            } for a in assets
        ]
    except Exception as e:
        logger.error(f"Error fetching marketplace assets: {e}")
        raise HTTPException(status_code=500, detail=str(e))
