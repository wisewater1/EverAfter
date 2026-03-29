from __future__ import annotations

from datetime import datetime, timedelta
from statistics import mean, pstdev
from typing import Any, Dict, Iterable, List, Mapping, Sequence

from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession


LIVE_WIDGET_TYPES = {
    "glucose_trend",
    "glucose_stats",
    "heart_rate_zones",
    "hrv_trend",
    "sleep_stages",
    "sleep_score",
    "activity_summary",
    "health_summary",
    "metric_gauge",
    "deep_dive_insight",
}

PLANNED_WIDGET_TYPES = {
    "training_load",
    "vo2_max_trend",
    "correlation_chart",
    "multi_metric_timeline",
    "recovery_score",
    "strain_recovery",
}

GLUCOSE_ALIASES = ("glucose", "blood_glucose")
HRV_ALIASES = ("hrv", "heart_rate_variability")
HEART_RATE_ALIASES = ("heart_rate", "resting_heart_rate", "resting_hr")
SLEEP_DURATION_ALIASES = ("sleep_duration", "sleep")
ACTIVE_MINUTES_ALIASES = ("active_minutes", "activity_minutes")
CALORIE_ALIASES = ("calories", "active_calories")

DEFAULT_GAUGE_GOALS = {
    "steps": 10000.0,
    "sleep_duration": 8.0,
    "active_minutes": 60.0,
    "calories": 2200.0,
    "glucose": 140.0,
    "heart_rate": 70.0,
    "resting_heart_rate": 60.0,
    "hrv": 60.0,
}


class WidgetDataEmpty(Exception):
    pass


async def fetch_metric_rows(
    session: AsyncSession,
    user_id: str,
    *,
    since: datetime | None = None,
) -> List[Dict[str, Any]]:
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

    last_error: Exception | None = None
    for query in queries:
        try:
            result = await session.execute(text(query), params)
            return [dict(row) for row in result.mappings().all()]
        except Exception as exc:
            last_error = exc
            await session.rollback()

    if last_error:
        raise last_error
    return []


async def fetch_aggregate_metric_rows(session: AsyncSession, user_id: str) -> List[Dict[str, Any]]:
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

    last_error: Exception | None = None
    for query in queries:
        try:
            result = await session.execute(text(query), {"user_id": user_id})
            return [dict(row) for row in result.mappings().all()]
        except Exception as exc:
            last_error = exc
            await session.rollback()

    if last_error:
        raise last_error
    return []


def build_summary_from_rows(rows: Sequence[Mapping[str, Any]]) -> Dict[str, Any]:
    grouped = _group_metric_rows(rows)
    total_samples = sum(len(metric_rows) for metric_rows in grouped.values())

    sleep_score = _average_value(grouped, "sleep_score")
    activity_score = _average_value(grouped, "activity_score")
    if sleep_score is None:
        sleep_duration = _average_value(grouped, *SLEEP_DURATION_ALIASES)
        if sleep_duration is not None:
            sleep_score = min(100.0, max(0.0, float(sleep_duration) / 8.0 * 100.0))
    if activity_score is None:
        steps = _average_value(grouped, "steps")
        if steps is not None:
            activity_score = min(100.0, max(0.0, float(steps) / 10000.0 * 100.0))

    hrv_avg = _average_value(grouped, *HRV_ALIASES)
    resting_hr = _average_value(grouped, "resting_heart_rate", "resting_hr")
    readiness_score = _average_value(grouped, "readiness_score")

    last_sync_at = None
    for metric_rows in grouped.values():
        for row in metric_rows:
            recorded_at = row.get("recorded_at")
            if recorded_at and (last_sync_at is None or recorded_at > last_sync_at):
                last_sync_at = recorded_at

    return {
        "metrics": total_samples,
        "sleep_score": round(float(sleep_score), 1) if sleep_score is not None else None,
        "activity_score": round(float(activity_score), 1) if activity_score is not None else None,
        "hrv_avg": round(float(hrv_avg), 1) if hrv_avg is not None else None,
        "resting_heart_rate": round(float(resting_hr), 1) if resting_hr is not None else None,
        "readiness_score": round(float(readiness_score), 1) if readiness_score is not None else None,
        "sources": sorted(grouped.keys()),
        "last_sync_at": last_sync_at.isoformat() if last_sync_at else None,
    }


async def resolve_widget_payloads(
    session: AsyncSession,
    user_id: str,
    widgets: Sequence[Mapping[str, Any]],
) -> Dict[str, Dict[str, Any]]:
    lookback = datetime.utcnow() - timedelta(days=30)
    rows = await fetch_metric_rows(session, user_id, since=lookback)
    grouped = _group_metric_rows(rows)
    summary = build_summary_from_rows(rows)
    payloads: Dict[str, Dict[str, Any]] = {}

    for widget in widgets:
        widget_id = str(widget.get("id") or "")
        widget_type = str(widget.get("widget_type") or "")
        config = widget.get("config") or {}

        if not widget_id:
            continue

        if widget_type in PLANNED_WIDGET_TYPES:
            payloads[widget_id] = {
                "status": "planned",
                "error": "This widget is planned and is not available yet.",
            }
            continue

        if widget_type not in LIVE_WIDGET_TYPES:
            payloads[widget_id] = {
                "status": "error",
                "error": f"Unsupported widget type '{widget_type}'.",
            }
            continue

        try:
            data = _resolve_live_widget(widget_type, config, grouped, summary)
            payloads[widget_id] = {"status": "ready", "data": data}
        except WidgetDataEmpty as exc:
            payloads[widget_id] = {"status": "empty", "error": str(exc)}
        except Exception as exc:
            payloads[widget_id] = {"status": "error", "error": str(exc)}

    return payloads


def _resolve_live_widget(
    widget_type: str,
    config: Mapping[str, Any],
    grouped: Mapping[str, List[Dict[str, Any]]],
    summary: Mapping[str, Any],
) -> Dict[str, Any]:
    if widget_type == "glucose_trend":
        rows = _rows_for_aliases(grouped, *GLUCOSE_ALIASES)
        if not rows:
            raise WidgetDataEmpty("No glucose readings are available yet.")
        current_value = _numeric_value(rows[-1])
        previous_value = _numeric_value(rows[-2]) if len(rows) > 1 else current_value
        delta = current_value - previous_value
        trend = "stable"
        if delta > 5:
            trend = "up"
        elif delta < -5:
            trend = "down"
        tir_values = [_numeric_value(row) for row in rows]
        tir = round((sum(1 for value in tir_values if 70 <= value <= 180) / len(tir_values)) * 100)
        return {
            "current": round(current_value, 1),
            "trend": trend,
            "readings": [
                {
                    "time": row["recorded_at"].strftime("%H:%M") if row.get("recorded_at") else "",
                    "value": round(_numeric_value(row), 1),
                }
                for row in rows[-24:]
            ],
            "tir": tir,
        }

    if widget_type == "glucose_stats":
        rows = _rows_for_aliases(grouped, *GLUCOSE_ALIASES)
        if not rows:
            raise WidgetDataEmpty("No glucose readings are available yet.")
        values = [_numeric_value(row) for row in rows]
        avg = mean(values)
        cv = (pstdev(values) / avg * 100.0) if len(values) > 1 and avg else 0.0
        tir = round((sum(1 for value in values if 70 <= value <= 180) / len(values)) * 100)
        below = round((sum(1 for value in values if value < 70) / len(values)) * 100)
        above = max(0, 100 - tir - below)
        return {
            "mean": round(avg, 1),
            "gmi": round(3.31 + (0.02392 * avg), 1),
            "cv": round(cv, 1),
            "tir": tir,
            "below": below,
            "above": above,
        }

    if widget_type == "heart_rate_zones":
        rows = _rows_for_aliases(grouped, "heart_rate")
        if not rows:
            raise WidgetDataEmpty("No heart rate readings are available yet.")
        zone_counts = {
            "Rest": 0,
            "Light": 0,
            "Moderate": 0,
            "Hard": 0,
            "Max": 0,
        }
        for row in rows:
            value = _numeric_value(row)
            if value < 60:
                zone_counts["Rest"] += 1
            elif value < 90:
                zone_counts["Light"] += 1
            elif value < 120:
                zone_counts["Moderate"] += 1
            elif value < 150:
                zone_counts["Hard"] += 1
            else:
                zone_counts["Max"] += 1
        return {
            "zones": [
                {"name": "Rest", "minutes": zone_counts["Rest"] * 5, "color": "bg-gray-500"},
                {"name": "Light", "minutes": zone_counts["Light"] * 5, "color": "bg-blue-500"},
                {"name": "Moderate", "minutes": zone_counts["Moderate"] * 5, "color": "bg-green-500"},
                {"name": "Hard", "minutes": zone_counts["Hard"] * 5, "color": "bg-yellow-500"},
                {"name": "Max", "minutes": zone_counts["Max"] * 5, "color": "bg-red-500"},
            ],
        }

    if widget_type == "hrv_trend":
        rows = _rows_for_aliases(grouped, *HRV_ALIASES)
        if not rows:
            raise WidgetDataEmpty("No HRV readings are available yet.")
        trend_points = []
        buckets: Dict[str, List[float]] = {}
        for row in rows:
            recorded_at = row.get("recorded_at")
            if not recorded_at:
                continue
            buckets.setdefault(recorded_at.strftime("%m-%d"), []).append(_numeric_value(row))
        for label, values in list(buckets.items())[-7:]:
            trend_points.append({"day": label, "value": round(mean(values), 1)})
        baseline_values = [_numeric_value(row) for row in rows[:-1]] or [_numeric_value(rows[-1])]
        return {
            "current": round(_numeric_value(rows[-1]), 1),
            "baseline": round(mean(baseline_values), 1),
            "trend": trend_points,
        }

    if widget_type == "sleep_stages":
        stage_definitions = (
            ("awake", ("sleep_stage_awake", "awake_minutes"), "bg-red-500"),
            ("light", ("sleep_stage_light", "light_sleep_minutes"), "bg-blue-400"),
            ("deep", ("sleep_stage_deep", "deep_sleep_minutes"), "bg-blue-700"),
            ("rem", ("sleep_stage_rem", "rem_sleep_minutes"), "bg-purple-500"),
        )
        stages = []
        total = 0.0
        for label, aliases, color in stage_definitions:
            values = [_numeric_value(row) for row in _rows_for_aliases(grouped, *aliases)]
            duration = round(sum(values), 1) if values else 0.0
            total += duration
            stages.append({"type": label, "duration": duration, "color": color})
        if total <= 0:
            raise WidgetDataEmpty("Sleep stage data has not been imported yet.")
        return {"stages": stages, "totalMinutes": round(total, 1)}

    if widget_type == "sleep_score":
        score = _average_value(grouped, "sleep_score")
        duration = _average_value(grouped, *SLEEP_DURATION_ALIASES)
        efficiency = _average_value(grouped, "sleep_efficiency")
        if duration is None and score is None:
            raise WidgetDataEmpty("No sleep data is available yet.")
        duration_value = round(duration or 0.0, 1)
        score_value = round(score if score is not None else min(100.0, (duration_value / 8.0) * 100.0), 1)
        efficiency_value = round(efficiency if efficiency is not None else min(100.0, (duration_value / 8.0) * 100.0), 1)
        quality = "Excellent" if score_value >= 90 else "Good" if score_value >= 75 else "Fair" if score_value >= 60 else "Needs work"
        return {
            "score": score_value,
            "quality": quality,
            "duration": duration_value,
            "efficiency": efficiency_value,
        }

    if widget_type == "activity_summary":
        steps = _latest_value(grouped, "steps")
        calories = _latest_value(grouped, *CALORIE_ALIASES)
        active_minutes = _latest_value(grouped, *ACTIVE_MINUTES_ALIASES)
        if steps is None and calories is None and active_minutes is None:
            raise WidgetDataEmpty("No activity metrics are available yet.")
        return {
            "steps": round(steps or 0.0),
            "goal": round(float(config.get("goal") or DEFAULT_GAUGE_GOALS["steps"])),
            "calories": round(calories or 0.0),
            "activeMinutes": round(active_minutes or 0.0),
        }

    if widget_type == "health_summary":
        if not summary.get("metrics"):
            raise WidgetDataEmpty("No health metrics are available yet.")
        return {
            "metrics": [
                {
                    "label": "Glucose",
                    "value": round(_latest_value(grouped, *GLUCOSE_ALIASES) or 0.0, 1),
                    "unit": _latest_unit(grouped, *GLUCOSE_ALIASES) or "mg/dL",
                    "status": "good",
                },
                {
                    "label": "Heart Rate",
                    "value": round(_latest_value(grouped, "heart_rate") or _latest_value(grouped, "resting_heart_rate") or 0.0, 1),
                    "unit": _latest_unit(grouped, "heart_rate", "resting_heart_rate") or "bpm",
                    "status": "good",
                },
                {
                    "label": "Sleep",
                    "value": round(_average_value(grouped, *SLEEP_DURATION_ALIASES) or 0.0, 1),
                    "unit": _latest_unit(grouped, *SLEEP_DURATION_ALIASES) or "hrs",
                    "status": "good",
                },
                {
                    "label": "Steps",
                    "value": round(_latest_value(grouped, "steps") or 0.0),
                    "unit": _latest_unit(grouped, "steps") or "steps",
                    "status": "warning" if (_latest_value(grouped, "steps") or 0.0) < DEFAULT_GAUGE_GOALS["steps"] else "good",
                },
            ],
        }

    if widget_type == "metric_gauge":
        metric_name = str(config.get("metric") or "steps").strip().lower()
        value = _latest_value(grouped, metric_name)
        if value is None:
            raise WidgetDataEmpty(f"No readings are available for {metric_name.replace('_', ' ')}.")
        goal = float(config.get("goal") or DEFAULT_GAUGE_GOALS.get(metric_name, 100.0))
        return {
            "value": round(value, 1),
            "goal": round(goal, 1),
            "label": str(config.get("label") or metric_name.replace("_", " ").title()),
            "unit": _latest_unit(grouped, metric_name) or "",
        }

    if widget_type == "deep_dive_insight":
        if not summary.get("metrics"):
            raise WidgetDataEmpty("No health metrics are available yet.")
        factors: List[str] = []
        sentences: List[str] = []
        sleep_score = summary.get("sleep_score")
        activity_score = summary.get("activity_score")
        readiness = summary.get("readiness_score")
        resting_hr = summary.get("resting_heart_rate")
        hrv_avg = summary.get("hrv_avg")

        if sleep_score is not None:
            if sleep_score >= 80:
                factors.append("Sleep consistency")
                sentences.append("Sleep quality is holding in a supportive range.")
            else:
                factors.append("Sleep pressure")
                sentences.append("Sleep quality is below target and is likely reducing resilience.")

        if activity_score is not None:
            if activity_score >= 75:
                factors.append("Activity adherence")
                sentences.append("Activity volume is staying close to goal.")
            else:
                factors.append("Movement deficit")
                sentences.append("Movement volume is trailing goal and is leaving recovery headroom unused.")

        if resting_hr is not None:
            if resting_hr <= 65:
                factors.append("Cardiovascular baseline")
                sentences.append("Resting heart rate remains stable.")
            else:
                factors.append("Elevated resting heart rate")
                sentences.append("Resting heart rate is elevated versus an ideal recovery baseline.")

        if hrv_avg is not None:
            if hrv_avg >= 55:
                factors.append("Recovery reserve")
                sentences.append("HRV suggests recovery reserve is still present.")
            else:
                factors.append("Recovery strain")
                sentences.append("HRV is softening and may indicate strain or poor recovery.")

        if readiness is not None:
            sentences.append(f"Readiness is currently tracking at {round(float(readiness), 1)}.")

        if not sentences:
            raise WidgetDataEmpty("Not enough longitudinal data is available for a deep-dive insight yet.")

        return {
            "title": "St. Raphael's Holistic Analysis",
            "description": " ".join(sentences),
            "factors": factors[:4] or ["Recent health data"],
        }

    raise WidgetDataEmpty("This widget does not have a live resolver yet.")


def _group_metric_rows(rows: Sequence[Mapping[str, Any]]) -> Dict[str, List[Dict[str, Any]]]:
    grouped: Dict[str, List[Dict[str, Any]]] = {}
    for row in rows:
        metric_type = str(row.get("metric_type") or "").strip().lower()
        if not metric_type:
            continue
        grouped.setdefault(metric_type, []).append(dict(row))
    return grouped


def _rows_for_aliases(grouped: Mapping[str, List[Dict[str, Any]]], *aliases: str) -> List[Dict[str, Any]]:
    collected: List[Dict[str, Any]] = []
    for alias in aliases:
        collected.extend(grouped.get(alias.lower(), []))
    collected.sort(key=lambda row: row.get("recorded_at") or datetime.min)
    return collected


def _numeric_value(row: Mapping[str, Any]) -> float:
    return float(row.get("metric_value") or 0.0)


def _average_value(grouped: Mapping[str, List[Dict[str, Any]]], *aliases: str) -> float | None:
    rows = _rows_for_aliases(grouped, *aliases)
    if not rows:
        return None
    return mean(_numeric_value(row) for row in rows)


def _latest_value(grouped: Mapping[str, List[Dict[str, Any]]], *aliases: str) -> float | None:
    rows = _rows_for_aliases(grouped, *aliases)
    if not rows:
        return None
    return _numeric_value(rows[-1])


def _latest_unit(grouped: Mapping[str, List[Dict[str, Any]]], *aliases: str) -> str | None:
    rows = _rows_for_aliases(grouped, *aliases)
    if not rows:
        return None
    unit = rows[-1].get("metric_unit")
    return str(unit) if unit is not None else None
