import math
from datetime import datetime, timedelta
from fastapi import APIRouter, Depends, HTTPException, status
from typing import List, Dict, Any, Optional, Sequence
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession
from pydantic import BaseModel, Field

from app.db.session import get_session
from app.services.health_fhir_imports import health_fhir_import_worker
from app.services.health.service import health_service
from app.services.health.core import PredictionResult
from app.services.shared_health_predictor import shared_predictor
from app.services.health_widgets import (
    build_summary_from_rows,
    fetch_metric_rows,
    resolve_widget_payloads,
)
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


class HealthWidgetRequest(BaseModel):
    id: str
    widget_type: str
    config: Dict[str, Any] = Field(default_factory=dict)
    data_sources: List[str] = Field(default_factory=list)


class HealthWidgetsDataRequest(BaseModel):
    widgets: List[HealthWidgetRequest] = Field(default_factory=list)


def _current_user_id(current_user: Dict[str, Any]) -> str:
    return str(current_user.get("id") or current_user.get("sub") or "")


def _require_current_user_id(current_user: Dict[str, Any]) -> str:
    user_id = _current_user_id(current_user)
    if not user_id:
        raise HTTPException(status_code=401, detail="Unable to resolve current user")
    return user_id


def _require_matching_user(path_user_id: str, current_user: Dict[str, Any]) -> str:
    user_id = _require_current_user_id(current_user)
    if user_id != path_user_id:
        raise HTTPException(status_code=403, detail="Unauthorized")
    return user_id


def _safe_float(value: Any) -> Optional[float]:
    try:
        return float(value)
    except (TypeError, ValueError):
        return None


def _prediction_risk_for_ui(value: Any) -> str:
    normalized = str(value or "").lower()
    if normalized in {"high", "critical"}:
        return "high"
    if normalized == "moderate":
        return "medium"
    return "low"


def _strength_for_correlation(value: float) -> str:
    magnitude = abs(value)
    if magnitude >= 0.7:
        return "strong"
    if magnitude >= 0.4:
        return "moderate"
    return "weak"


def _pearson_correlation(series_a: Sequence[float], series_b: Sequence[float]) -> Optional[float]:
    sample_size = min(len(series_a), len(series_b))
    if sample_size < 3:
        return None

    trimmed_a = list(series_a[-sample_size:])
    trimmed_b = list(series_b[-sample_size:])
    mean_a = sum(trimmed_a) / sample_size
    mean_b = sum(trimmed_b) / sample_size
    numerator = sum((left - mean_a) * (right - mean_b) for left, right in zip(trimmed_a, trimmed_b))
    denominator_a = math.sqrt(sum((value - mean_a) ** 2 for value in trimmed_a))
    denominator_b = math.sqrt(sum((value - mean_b) ** 2 for value in trimmed_b))
    if denominator_a == 0 or denominator_b == 0:
        return None
    return max(-1.0, min(1.0, numerator / (denominator_a * denominator_b)))


def _build_correlations(rows: Sequence[Dict[str, Any]]) -> List[Dict[str, Any]]:
    grouped: Dict[str, List[float]] = {}
    for row in rows:
        metric_type = str(row.get("metric_type") or "").strip()
        metric_value = _safe_float(row.get("metric_value"))
        if not metric_type or metric_value is None:
            continue
        grouped.setdefault(metric_type, []).append(metric_value)

    metric_names = sorted(name for name, values in grouped.items() if len(values) >= 3)
    correlations: List[Dict[str, Any]] = []

    for index, metric_a in enumerate(metric_names):
        for metric_b in metric_names[index + 1:]:
            correlation = _pearson_correlation(grouped[metric_a], grouped[metric_b])
            if correlation is None:
                continue
            correlations.append(
                {
                    "metric_1": metric_a,
                    "metric_2": metric_b,
                    "correlation": round(correlation, 2),
                    "strength": _strength_for_correlation(correlation),
                }
            )

    correlations.sort(key=lambda item: abs(item["correlation"]), reverse=True)
    return correlations[:3]


def _build_prediction_patterns(prediction: Dict[str, Any]) -> List[Dict[str, Any]]:
    patterns: List[Dict[str, Any]] = []
    for lane in prediction.get("condition_forecasts", []):
        score = max(0.0, min(100.0, _safe_float(lane.get("score")) or 0.0))
        trend = str(lane.get("trend_direction") or "stable")
        delta = 6.0 if trend == "declining" else -6.0 if trend == "improving" else 2.0
        lower_bound = max(0.0, min(100.0, score + min(delta, 0.0)))
        upper_bound = max(0.0, min(100.0, score + max(delta, 0.0)))
        patterns.append(
            {
                "metric": str(lane.get("lane") or "baseline"),
                "trend": trend,
                "confidence": int(round(_safe_float(lane.get("confidence")) or 0.0)),
                "prediction_next_7_days": {
                    "expected_range": [round(lower_bound, 1), round(upper_bound, 1)],
                    "risk_level": _prediction_risk_for_ui(lane.get("current_risk_level")),
                },
            }
        )
    return patterns


def _build_prediction_insights(
    prediction: Dict[str, Any],
    summary: Dict[str, Any],
    rows: Sequence[Dict[str, Any]],
) -> List[str]:
    total_metrics = len({str(row.get("metric_type") or "") for row in rows if row.get("metric_type")})
    insights = [f"Raphael analyzed {len(rows)} observations across {total_metrics} live metric streams."]

    primary_pattern = next(iter(prediction.get("condition_forecasts", [])), None)
    if primary_pattern:
        insights.append(
            f"Primary watch lane: {str(primary_pattern.get('lane', 'baseline')).replace('_', ' ')} is {primary_pattern.get('trend_direction', 'stable')} with {primary_pattern.get('current_risk_level', 'low')} risk."
        )

    if summary.get("sleep_score") is not None:
        insights.append(f"Sleep score is averaging {summary['sleep_score']:.1f}, which is feeding the current trajectory baseline.")
    if summary.get("activity_score") is not None:
        insights.append(f"Activity score is averaging {summary['activity_score']:.1f} based on recorded movement data.")

    return insights[:3]


def _build_prediction_recommendations(prediction: Dict[str, Any], rows: Sequence[Dict[str, Any]]) -> List[str]:
    recommendations: List[str] = []
    metric_names = {str(row.get("metric_type") or "") for row in rows}

    missing_core = [
        label
        for key, label in {
            "heart_rate": "heart rate",
            "glucose": "glucose",
            "sleep_duration": "sleep duration",
            "steps": "daily steps",
        }.items()
        if key not in metric_names
    ]
    if missing_core:
        recommendations.append(
            f"Record {', '.join(missing_core[:3])} to strengthen Raphael's confidence and reduce blind spots."
        )

    for lane in prediction.get("condition_forecasts", []):
        if str(lane.get("current_risk_level") or "").lower() not in {"high", "critical"}:
            continue
        recommendations.append(
            f"Prioritize the {str(lane.get('lane') or 'baseline').replace('_', ' ')} lane; current trend is {lane.get('trend_direction', 'stable')} and requires closer monitoring."
        )
        if len(recommendations) >= 3:
            break

    if not recommendations:
        recommendations.append(
            "Keep recording repeat measurements so Raphael can validate trend stability over the next seven days."
        )

    return recommendations[:3]


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
    user_id = _require_current_user_id(current_user)

    since = datetime.utcnow() - timedelta(days=max(1, lookbackDays))
    rows = await fetch_metric_rows(session, user_id, since=since)

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
    user_id = _require_current_user_id(current_user)
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
    user_id = _require_current_user_id(current_user)

    try:
        rows = await fetch_metric_rows(session, user_id)
    except Exception:
        rows = []

    return build_summary_from_rows(rows)


@router.post("/widgets/data", response_model=Dict[str, Any])
async def get_widget_data(
    payload: HealthWidgetsDataRequest,
    session: AsyncSession = Depends(get_session),
    current_user: Dict[str, Any] = Depends(get_current_user),
):
    user_id = _require_current_user_id(current_user)
    if not payload.widgets:
        return {"items": {}}

    items = await resolve_widget_payloads(
        session,
        user_id,
        [widget.model_dump() for widget in payload.widgets],
    )
    return {"items": items}

@router.post("/fhir-import/{user_id}", status_code=status.HTTP_202_ACCEPTED)
async def import_fhir_bulk(
    user_id: str,
    fhir_bundle: Dict[str, Any],
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """
    Ingests a FHIR Bundle (e.g. from an EHR export) and normalization.
    Maps Conditions, Observations, and Meds implicitly connected to the Family Graph.
    """
    _require_matching_user(user_id, current_user)

    if fhir_bundle.get("resourceType") != "Bundle":
        raise HTTPException(status_code=400, detail="Expected a FHIR Bundle resource")

    return await health_fhir_import_worker.enqueue_fhir_bundle(user_id, fhir_bundle)


@router.get("/fhir-import/jobs/{job_id}", response_model=Dict[str, Any])
async def get_fhir_import_job(
    job_id: str,
    current_user: Dict[str, Any] = Depends(get_current_user),
):
    user_id = _require_current_user_id(current_user)
    job = await health_fhir_import_worker.get_job(user_id, job_id)
    if job is None:
        raise HTTPException(status_code=404, detail="FHIR import job not found")
    return job

@router.get("/predictions", response_model=Dict[str, Any])
async def get_health_predictions(
    lookbackDays: int = 30,
    session: AsyncSession = Depends(get_session),
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """
    Retrieves predictive health trajectories using live health metrics only.
    """
    user_id = _require_current_user_id(current_user)
    since = datetime.utcnow() - timedelta(days=max(1, lookbackDays))
    rows = await fetch_metric_rows(session, user_id, since=since)
    summary = build_summary_from_rows(rows)

    if not rows:
        return {
            "analysis": {
                "period_analyzed": f"Past {lookbackDays} days",
                "total_data_points": 0,
                "metrics_analyzed": 0,
            },
            "patterns": [],
            "correlations": [],
            "insights": [
                "Raphael does not have enough live health measurements yet to calculate predictive analytics.",
            ],
            "recommendations": [
                "Record at least a few live health metrics to initialize predictive analytics.",
            ],
            "generated_at": datetime.utcnow().isoformat(),
        }

    metrics_history = [
        {
            "metric_type": row.get("metric_type"),
            "value": _safe_float(row.get("metric_value")),
            "unit": row.get("metric_unit"),
            "recorded_at": row.get("recorded_at").isoformat() if row.get("recorded_at") else None,
            "source": row.get("source"),
        }
        for row in rows
        if row.get("metric_type") and _safe_float(row.get("metric_value")) is not None
    ]
    if not metrics_history:
        return {
            "analysis": {
                "period_analyzed": f"Past {lookbackDays} days",
                "total_data_points": 0,
                "metrics_analyzed": 0,
            },
            "patterns": [],
            "correlations": [],
            "insights": [
                "Raphael found health records, but they do not contain enough usable numeric measurements for predictive analytics yet.",
            ],
            "recommendations": [
                "Record repeat biometric measurements so Raphael can calculate real predictive trends.",
            ],
            "generated_at": datetime.utcnow().isoformat(),
        }
    prediction = await shared_predictor.predict_user(user_id, metrics_history, None)

    analytics_data = {
        "analysis": {
            "period_analyzed": f"Past {lookbackDays} days",
            "total_data_points": len(metrics_history),
            "metrics_analyzed": len({item["metric_type"] for item in metrics_history}),
        },
        "patterns": _build_prediction_patterns(prediction),
        "correlations": _build_correlations(rows),
        "insights": _build_prediction_insights(prediction, summary, rows),
        "recommendations": _build_prediction_recommendations(prediction, rows),
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
    _require_matching_user(user_id, current_user)

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
    _require_matching_user(user_id, current_user)

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
