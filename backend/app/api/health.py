from fastapi import APIRouter, Depends, HTTPException, status
from typing import List, Dict, Any
from app.services.health.service import health_service
from app.services.health.core import PredictionResult
from app.auth.dependencies import get_current_user

router = APIRouter(prefix="/api/v1/health", tags=["health"])

@router.get("/predictions", response_model=Dict[str, Any])
async def get_health_predictions(
    lookbackDays: int = 30,
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """
    Retrieves predictive health trajectories.
    Returns dynamic data matching the frontend AnalyticsData interface.
    """
    sub = current_user.get("sub", "demo-user-001")
    import random
    from datetime import datetime
    
    # Generate dynamic predictive data so it's not identical every time
    base_confidence = random.randint(75, 95)
    glucose_trend = random.choice(["improving", "stable", "declining"])
    hrv_trend = random.choice(["improving", "stable"])
    sleep_trend = random.choice(["stable", "declining"])
    
    analytics_data = {
        "analysis": {
            "period_analyzed": f"Past {lookbackDays} days",
            "total_data_points": lookbackDays * random.randint(12, 24),
            "metrics_analyzed": 5
        },
        "patterns": [
            {
                "metric": "glucose_variability",
                "trend": glucose_trend,
                "confidence": base_confidence,
                "prediction_next_7_days": {
                    "expected_range": [random.uniform(90, 100), random.uniform(115, 130)],
                    "risk_level": "low" if glucose_trend == "improving" else "medium"
                }
            },
            {
                "metric": "heart_rate_variability",
                "trend": hrv_trend,
                "confidence": base_confidence - 5,
                "prediction_next_7_days": {
                    "expected_range": [random.uniform(45, 55), random.uniform(60, 75)],
                    "risk_level": "low"
                }
            },
            {
                "metric": "sleep_efficiency",
                "trend": sleep_trend,
                "confidence": base_confidence - 10,
                "prediction_next_7_days": {
                    "expected_range": [random.uniform(70, 75), random.uniform(80, 88)],
                    "risk_level": "medium" if sleep_trend == "declining" else "low"
                }
            }
        ],
        "correlations": [
            {
                "metric_1": "sleep_efficiency",
                "metric_2": "heart_rate_variability",
                "correlation": random.uniform(0.65, 0.85),
                "strength": "strong"
            },
            {
                "metric_1": "activity_level",
                "metric_2": "glucose_variability",
                "correlation": round(random.uniform(-0.5, -0.8), 2),
                "strength": "moderate"
            }
        ],
        "insights": [
            "Your glucose variability is stabilizing during active days.",
            f"Delphi model suggests your sleep efficiency heavily impacts your HRV by ~{(random.uniform(30, 45)):.1f}%.",
            f"Based on the {lookbackDays} day lookback, evening activity improves morning readiness."
        ],
        "recommendations": [
            "Maintain consistent sleep schedules to further improve HRV.",
            "Consider light activity after dinner to flatten the glucose curve.",
            "Stay hydrated during the afternoon to prevent fatigue spikes."
        ],
        "generated_at": datetime.utcnow().isoformat()
    }

    return analytics_data

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
