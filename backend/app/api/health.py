from fastapi import APIRouter, Depends, HTTPException, status
from typing import List, Dict, Any
from app.services.health.service import health_service
from app.services.health.core import PredictionResult
from app.auth.dependencies import get_current_user

router = APIRouter(prefix="/api/v1/health", tags=["health"])

@router.get("/predictions/{user_id}", response_model=List[PredictionResult])
async def get_health_predictions(
    user_id: str,
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """
    Retrieves predictive health trajectories using the Delphi model.
    """
    # Security: Ensure user is requesting their own data
    if str(current_user.get("sub")) != user_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You do not have permission to access this health data."
        )

    # In a real scenario, we'd fetch actual history from the DB here.
    # For now, we pass some mock history to trigger the Delphi strategy.
    mock_history = [
        {"timestamp": "2026-02-14T10:00:00", "type": "heart_rate", "value": 72},
        {"timestamp": "2026-02-14T12:00:00", "type": "heart_rate", "value": 75},
        {"timestamp": "2026-02-14T14:00:00", "type": "glucose", "value": 110},
    ]

    try:
        predictions = await health_service.get_predictions(user_id, mock_history)
        return predictions
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to generate predictions: {str(e)}"
        )
