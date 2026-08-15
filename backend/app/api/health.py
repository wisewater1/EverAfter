from datetime import datetime, timedelta
from fastapi import APIRouter, Depends, HTTPException, status
from typing import List, Dict, Any, Optional
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession
from pydantic import BaseModel, Field

from app.db.session import get_session
from app.services.health.service import health_service
from app.services.health.core import PredictionResult
from app.auth.dependencies import get_current_user
import logging

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/v1/health", tags=["health"])


class HealthMetricWrite(BaseModel):
    metric_type: str
    value: float
    unit: str
    source: str = "manual_entry"
    recorded_at: Optional[str] = None


class HealthMetricsWriteRequest(BaseModel):
    metrics: List[HealthMetricWrite] = Field(default_factory=list)


async def _fetch_metric_rows(
    session: AsyncSession,
    user_id: str,
    since: Optional[datetime] = None,
):
    where_since = "\n          and recorded_at >= :since" if since is not None else ""
    params: Dict[str, Any] = {"user_id": user_id}
    if since is not None:
        params["since"] = since
    queries = [
        f"""
        select metric_type, metric_value as metric_value, metric_unit as metric_unit, recorded_at, source
        from health_metrics
        where user_id = :user_id{where_since}
        order by recorded_at asc
        """,
        f"""
        select metric_type, value as metric_value, unit as metric_unit, recorded_at, source
        from health_metrics
        where user_id = :user_id{where_since}
        order by recorded_at asc
        """,
    ]
    last_error: Optional[Exception] = None
    for query in queries:
        try:
            result = await session.execute(text(query), params)
            return result.mappings().all()
        except Exception as exc:
            last_error = exc
            await session.rollback()
    if last_error:
        raise last_error
    return []


async def _aggregate_metric_rows(session: AsyncSession, user_id: str):
    queries = [
        """
        select metric_type, avg(metric_value) as avg_value, count(*) as sample_count, max(recorded_at) as last_recorded_at
        from health_metrics
        where user_id = :user_id
        group by metric_type
        """,
        """
        select metric_type, avg(value) as avg_value, count(*) as sample_count, max(recorded_at) as last_recorded_at
        from health_metrics
        where user_id = :user_id
        group by metric_type
        """,
    ]
    last_error: Optional[Exception] = None
    for query in queries:
        try:
            result = await session.execute(text(query), {"user_id": user_id})
            return result.mappings().all()
        except Exception as exc:
            last_error = exc
            await session.rollback()
    if last_error:
        raise last_error
    return []


async def _insert_metric_row(session: AsyncSession, user_id: str, metric: HealthMetricWrite, recorded_at: datetime):
    queries = [
        """
        insert into health_metrics (user_id, metric_type, metric_value, metric_unit, recorded_at, source)
        values (:user_id, :metric_type, :value, :unit, :recorded_at, :source)
        """,
        """
        insert into health_metrics (user_id, metric_type, value, unit, recorded_at, source)
        values (:user_id, :metric_type, :value, :unit, :recorded_at, :source)
        """,
    ]
    params = {
        "user_id": user_id,
        "metric_type": metric.metric_type,
        "value": metric.value,
        "unit": metric.unit,
        "recorded_at": recorded_at,
        "source": metric.source or "manual_entry",
    }
    last_error: Optional[Exception] = None
    for query in queries:
        try:
            await session.execute(text(query), params)
            return
        except Exception as exc:
            last_error = exc
            await session.rollback()
    if last_error:
        raise last_error


@router.get("/metrics", response_model=Dict[str, Any])
async def list_health_metrics(
    lookbackDays: int = 30,
    session: AsyncSession = Depends(get_session),
    current_user: Dict[str, Any] = Depends(get_current_user),
):
    user_id = str(current_user.get("sub") or current_user.get("id") or "")
    if not user_id:
        raise HTTPException(status_code=401, detail="Unable to resolve current user")

    since = datetime.utcnow() - timedelta(days=max(1, lookbackDays))
    try:
        rows = await _fetch_metric_rows(session, user_id, since)
    except Exception:
        logger.warning("Health metrics unavailable for user %s", user_id, exc_info=True)
        rows = []

    return {
        "metrics": [
            {
                "metric_type": row["metric_type"],
                "value": float(row["metric_value"]),
                "unit": row["metric_unit"],
                "recorded_at": row["recorded_at"].isoformat() if row["recorded_at"] else None,
                "source": row["source"] or "manual_entry",
            }
            for row in rows
        ]
    }


@router.post("/metrics", response_model=Dict[str, Any])
async def store_health_metrics(
    payload: HealthMetricsWriteRequest,
    session: AsyncSession = Depends(get_session),
    current_user: Dict[str, Any] = Depends(get_current_user),
):
    user_id = str(current_user.get("sub") or current_user.get("id") or "")
    if not user_id:
        raise HTTPException(status_code=401, detail="Unable to resolve current user")
    if not payload.metrics:
        raise HTTPException(status_code=400, detail="At least one health metric is required.")

    stored = 0
    for metric in payload.metrics:
        recorded_at = datetime.fromisoformat(metric.recorded_at) if metric.recorded_at else datetime.utcnow()
        await _insert_metric_row(session, user_id, metric, recorded_at)
        stored += 1

    await session.commit()
    return {"stored": stored}


@router.get("/summary", response_model=Dict[str, Any])
async def get_health_summary(
    session: AsyncSession = Depends(get_session),
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    user_id = str(current_user.get("sub") or current_user.get("id") or "")
    if not user_id:
        raise HTTPException(status_code=401, detail="Unable to resolve current user")

    try:
        rows = await _aggregate_metric_rows(session, user_id)
    except Exception:
        rows = []

    metric_map = {str(row["metric_type"]).lower(): row for row in rows}
    total_samples = sum(int(row["sample_count"] or 0) for row in rows)

    sleep_score = metric_map.get("sleep_score", {}).get("avg_value")
    activity_score = metric_map.get("activity_score", {}).get("avg_value")
    if sleep_score is None:
        sleep_duration = metric_map.get("sleep_duration", {}).get("avg_value")
        if sleep_duration is not None:
            sleep_score = min(100.0, max(0.0, float(sleep_duration) / 8.0 * 100.0))
    if activity_score is None:
        steps = metric_map.get("steps", {}).get("avg_value")
        if steps is not None:
            activity_score = min(100.0, max(0.0, float(steps) / 10000.0 * 100.0))

    hrv_avg = (
        metric_map.get("hrv", {}).get("avg_value")
        or metric_map.get("heart_rate_variability", {}).get("avg_value")
    )
    resting_hr = (
        metric_map.get("resting_heart_rate", {}).get("avg_value")
        or metric_map.get("resting_hr", {}).get("avg_value")
    )
    readiness_score = metric_map.get("readiness_score", {}).get("avg_value")

    last_sync_at = None
    for row in rows:
        candidate = row.get("last_recorded_at")
        if candidate and (last_sync_at is None or candidate > last_sync_at):
            last_sync_at = candidate

    return {
        "metrics": total_samples,
        "sleep_score": round(float(sleep_score), 1) if sleep_score is not None else None,
        "activity_score": round(float(activity_score), 1) if activity_score is not None else None,
        "hrv_avg": round(float(hrv_avg), 1) if hrv_avg is not None else None,
        "resting_heart_rate": round(float(resting_hr), 1) if resting_hr is not None else None,
        "readiness_score": round(float(readiness_score), 1) if readiness_score is not None else None,
        "sources": sorted({str(row["metric_type"]).lower() for row in rows}),
        "last_sync_at": last_sync_at.isoformat() if last_sync_at else None,
    }

@router.post("/fhir-import/{user_id}")
async def import_fhir_bulk(
    user_id: str,
    fhir_bundle: Dict[str, Any],
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """
    Ingests a FHIR Bundle (e.g. from an EHR export) and normalization.
    Maps Conditions, Observations, and Meds implicitly connected to the Family Graph.
    """
    if str(current_user.get("sub")) != user_id:
        raise HTTPException(status_code=403, detail="Unauthorized")

    if fhir_bundle.get("resourceType") != "Bundle":
        raise HTTPException(status_code=400, detail="Expected a FHIR Bundle resource")

    entries = fhir_bundle.get("entry", [])
    logger.info(f"Received FHIR bundle for user {user_id} with {len(entries)} entries")

    counted = {
        "Observation": 0,
        "Condition": 0,
        "MedicationRequest": 0,
        "FamilyMemberHistory": 0
    }

    for entry in entries:
        resource = entry.get("resource", {})
        rtype = resource.get("resourceType")
        if rtype in counted:
            counted[rtype] += 1

    # HONEST STATUS: the persistence/normalization pipeline for these
    # resource types is not built yet, and nothing in this bundle is stored.
    # Returning "success" here made callers believe their clinical data was
    # imported while it was silently discarded — a data-loss lie. 501 tells
    # the truth until real ingestion ships.
    raise HTTPException(
        status_code=501,
        detail={
            "status": "not_implemented",
            "recognized_resource_counts": counted,
            "persisted_entries": 0,
            "message": (
                "FHIR clinical import isn't available yet: the bundle was parsed but "
                "NOT stored. Nothing from this import was saved. Re-import once "
                "clinical ingestion ships."
            ),
        },
    )

@router.get("/predictions", response_model=Dict[str, Any])
async def get_health_predictions(
    lookbackDays: int = 30,
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """
    Predictive health trajectories. Not implemented.

    This endpoint previously returned a complete, confident-looking analysis
    built entirely from random.uniform and random.randint: type 2 diabetes and
    hypertension risk scores, confidence percentages between 80 and 95, metric
    correlations, and prescriptive advice such as scheduling a lipid panel. One
    insight cited ACC/AHA logic while quoting a randomised improvement figure.
    None of it depended on the caller or on a single recorded observation, and
    the frontend rendered it as that person's own risk profile.

    It fails closed instead. The same choice was already made for the FHIR
    import above: refusing is honest, while inventing health data is not, and a
    caller cannot tell the difference from the response alone.
    """
    raise HTTPException(
        status_code=501,
        detail={
            "status": "not_implemented",
            "lookback_days": lookbackDays,
            "message": (
                "Predictive health analytics are not available yet. No prediction "
                "model is running, so no risk scores, confidence values, or "
                "correlations can be produced. Nothing shown here would have "
                "described your health."
            ),
        },
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
