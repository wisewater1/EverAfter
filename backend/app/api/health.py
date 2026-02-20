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

@router.post("/deep_dive/{user_id}", response_model=List[PredictionResult])
async def get_deep_dive_insights(
    user_id: str,
    aggregated_metrics: List[Dict[str, Any]],
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """
    Retrieves holistic deep dive health insights by aggregating multiple metrics.
    """
    # Security: Ensure user is requesting their own data
    if str(current_user.get("sub")) != user_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You do not have permission to access this health data."
        )

    if not aggregated_metrics:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Aggregated metrics must be provided."
        )

    try:
        insights = await health_service.get_deep_dive_insights(user_id, aggregated_metrics)
        return insights
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to generate deep dive insights: {str(e)}"
        )

@router.post("/simulate/decline/{user_id}")
async def simulate_health_decline(
    user_id: str,
    severity: str = "high",
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """
    DEBUG ONLY: Simulates a health decline to trigger St. Joseph's "Lasting Memory" reflection.
    """
    if str(current_user.get("sub")) != user_id:
        raise HTTPException(status_code=403, detail="Unauthorized")

    from app.services.saint_event_bus import saint_event_bus, HealthDeclineEvent
    
    event = HealthDeclineEvent(
        payload={
            "user_id": user_id,
            "metric": "heart_rate_variability",
            "value": 15,
            "severity": severity,
            "message": "Critical decline in HRV detected. Immediate attention required."
        }
    )
    
    await saint_event_bus.publish(event)
    
    return {"status": "event_published", "event_id": str(event.timestamp)}
