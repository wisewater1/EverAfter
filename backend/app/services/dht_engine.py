"""
Delphi Health Trajectory — Computation Engine
==============================================
Feature computation, risk scoring, OCEAN modulation.
Produces a DelphiHealthTrajectory from a list of Observations + OceanProfile.

Design: rule-based hybrid v1.
  - Deterministic thresholds for risk levels
  - EWM (exponentially weighted mean) for baselines and deltas
  - Z-score + IQR hybrid for anomaly detection
  - OCEAN modifier applied post-scoring to direction + alert tone
"""

from __future__ import annotations

import math
import statistics
from datetime import datetime, timedelta
from typing import Any, Dict, List, Optional, Tuple

from app.models.dht import (
    Anomaly, BehavioralModifiers, DelphiHealthTrajectory, DeltaArrow,
    Indicator, NextBestMeasurement, OceanProfile, OceanScores,
    Observation, RiskCard, RiskLevel, TrajectoryWindow, TrendBreak,
)


# ─────────────────────────────────────────────────────────────────────────────
# Clinical reference thresholds (conservative rule-based v1)
# ─────────────────────────────────────────────────────────────────────────────

_RISK_THRESHOLDS: Dict[str, Dict] = {
    # Heart rate variability (ms) — higher is better
    "hrv_ms": {
        "optimal_min": 50, "moderate_min": 30, "high_min": 20,
        "higher_is_better": True,
        "domain": "cardiovascular", "label": "HRV"
    },
    # Resting heart rate — lower is better
    "resting_hr": {
        "optimal_max": 65, "moderate_max": 79, "high_max": 90,
        "higher_is_better": False,
        "domain": "cardiovascular", "label": "Resting Heart Rate"
    },
    # Steps per day — higher is better
    "steps": {
        "optimal_min": 8000, "moderate_min": 5000, "high_min": 3000,
        "higher_is_better": True,
        "domain": "metabolic", "label": "Daily Steps"
    },
    # Sleep duration (hours)
    "sleep_hours": {
        "optimal_min": 7.0, "optimal_max": 9.0,
        "moderate_min": 6.0, "high_min": 5.0,
        "higher_is_better": True,
        "domain": "mental", "label": "Sleep Duration"
    },
    # Blood glucose mmol/L (fasting)
    "glucose_fasting": {
        "optimal_max": 5.6, "moderate_max": 6.9, "high_max": 7.8,
        "higher_is_better": False,
        "domain": "metabolic", "label": "Fasting Glucose"
    },
    # SpO2 %
    "spo2": {
        "optimal_min": 97, "moderate_min": 94, "high_min": 90,
        "higher_is_better": True,
        "domain": "respiratory", "label": "Blood Oxygen"
    },
    # Systolic blood pressure
    "systolic_bp": {
        "optimal_max": 120, "moderate_max": 130, "high_max": 140,
        "higher_is_better": False,
        "domain": "cardiovascular", "label": "Systolic BP"
    },
    # BMI
    "bmi": {
        "optimal_min": 18.5, "optimal_max": 24.9,
        "moderate_max": 29.9, "high_max": 99,
        "higher_is_better": False,
        "domain": "metabolic", "label": "BMI"
    },
}

# Metrics we want to surface as leading indicators (ordered by impact)
_LEADING_METRIC_ORDER = [
    "hrv_ms", "sleep_hours", "resting_hr", "steps",
    "glucose_fasting", "spo2", "systolic_bp", "bmi"
]

# Next-best-measurement: priority order + ideal staleness threshold (days)
_NEXT_BEST_PRIORITY = [
    ("glucose_fasting", "Fasting Glucose", "blood draw / CGM", 30),
    ("hrv_ms", "HRV", "wearable", 3),
    ("spo2", "Blood Oxygen (SpO2)", "wearable / pulse ox", 7),
    ("systolic_bp", "Blood Pressure", "manual / cuff", 14),
    ("sleep_hours", "Sleep Duration", "wearable", 3),
    ("bmi", "Body Weight / BMI", "manual", 30),
]


# ─────────────────────────────────────────────────────────────────────────────
# OCEAN → BehavioralModifiers
# ─────────────────────────────────────────────────────────────────────────────

def compute_behavioral_modifiers(scores: OceanScores) -> BehavioralModifiers:
    O, C, E, A, N = scores.O, scores.C, scores.E, scores.A, scores.N

    # Adherence risk: high N reduces adherence, high C improves it
    adherence_risk = max(0.0, min(1.0, 0.5 + (N - 50) / 100 - (C - 50) / 100))

    # Alert sensitivity
    if N > 65:
        alert_sensitivity = "calm"   # high anxiety → soften alerts
    elif N < 35:
        alert_sensitivity = "high"   # low anxiety → more direct
    else:
        alert_sensitivity = "moderate"

    # Intervention style
    if O > 65:
        intervention_style = "exploratory"
    elif C > 65:
        intervention_style = "structured"
    else:
        intervention_style = "supportive"

    # Nudge frequency
    if E > 65:
        nudge_frequency = "high"
    elif E < 35:
        nudge_frequency = "low"
    else:
        nudge_frequency = "moderate"

    return BehavioralModifiers(
        adherence_risk=round(adherence_risk, 2),
        alert_sensitivity=alert_sensitivity,
        intervention_style=intervention_style,
        checklist_preference=C > 60,
        alarm_fatigue_risk=round(max(0.0, (N - 50) / 50), 2),
        nudge_frequency=nudge_frequency,
    )


# ─────────────────────────────────────────────────────────────────────────────
# Helper: EWM baseline
# ─────────────────────────────────────────────────────────────────────────────

def _ewm_mean(values: List[float], alpha: float = 0.3) -> float:
    """Exponentially weighted mean (most recent = most weight)."""
    if not values:
        return 0.0
    ewm = values[0]
    for v in values[1:]:
        ewm = alpha * v + (1 - alpha) * ewm
    return ewm


def _delta_pct(new: float, old: float) -> float:
    if old == 0:
        return 0.0
    return round((new - old) / abs(old) * 100, 1)


def _arrow(delta: float, higher_is_better: bool) -> DeltaArrow:
    if abs(delta) < 2.0:
        return "→"
    if delta > 0:
        return "↑" if higher_is_better else "↑"
    return "↓"


def _risk_level_for_metric(metric: str, value: float) -> RiskLevel:
    cfg = _RISK_THRESHOLDS.get(metric)
    if cfg is None:
        return "low"
    hib = cfg.get("higher_is_better", True)
    if hib:
        if value >= cfg.get("optimal_min", 0):
            return "low"
        if value >= cfg.get("moderate_min", 0):
            return "moderate"
        if value >= cfg.get("high_min", 0):
            return "high"
        return "critical"
    else:
        # lower is better
        opt_max = cfg.get("optimal_max", float("inf"))
        mod_max = cfg.get("moderate_max", float("inf"))
        high_max = cfg.get("high_max", float("inf"))
        if value <= opt_max:
            return "low"
        if value <= mod_max:
            return "moderate"
        if value <= high_max:
            return "high"
        return "critical"


def _risk_level_ord(level: RiskLevel) -> int:
    return {"low": 0, "moderate": 1, "high": 2, "critical": 3}.get(level, 0)


# ─────────────────────────────────────────────────────────────────────────────
# Anomaly detection (Z-score hybrid)
# ─────────────────────────────────────────────────────────────────────────────

def _detect_anomalies(obs_by_metric: Dict[str, List[float]]) -> List[Anomaly]:
    anomalies: List[Anomaly] = []
    for metric, vals in obs_by_metric.items():
        if len(vals) < 5:
            continue
        mean = statistics.mean(vals)
        stdev = statistics.stdev(vals) or 1e-9
        for v in vals[-3:]:  # check last 3 readings
            z = abs(v - mean) / stdev
            if z > 3.0:
                severity = "severe" if z > 5 else "moderate" if z > 3.5 else "minor"
                low = mean - 2 * stdev
                high = mean + 2 * stdev
                anomalies.append(Anomaly(
                    metric=metric,
                    value=v,
                    expected_range=(round(low, 2), round(high, 2)),
                    zscore=round(z, 2),
                    detected_at=datetime.utcnow(),
                    severity=severity,
                ))
    return anomalies


# ─────────────────────────────────────────────────────────────────────────────
# Core DHT computation
# ─────────────────────────────────────────────────────────────────────────────

def compute_dht(
    person_id: str,
    observations: List[Observation],
    ocean_profile: Optional[OceanProfile] = None,
    family_id: Optional[str] = None,
    context_tags: Optional[List[str]] = None,
) -> DelphiHealthTrajectory:
    """
    Compute the full Delphi Health Trajectory for a person from their
    observation history (up to 90 days) and optional OCEAN profile.
    """
    now = datetime.utcnow()

    # ── Filter to last 90 days ────────────────────────────────────────────────
    cutoff = now - timedelta(days=90)
    obs = [o for o in observations if o.recorded_at >= cutoff]

    if not obs:
        # Empty — return a minimal skeleton
        dht = DelphiHealthTrajectory(
            person_id=person_id,
            family_id=family_id,
            data_quality="empty",
            context_tags=context_tags or [],
            confidence=0.0,
        )
        dht.next_best_measurement = _next_best({}, now)
        return dht

    # ── Group by metric (numeric only) ──────────────────────────────────────
    obs_by_metric: Dict[str, List[Tuple[datetime, float]]] = {}
    for o in obs:
        try:
            v = float(o.value)
        except (ValueError, TypeError):
            continue
        obs_by_metric.setdefault(o.metric, []).append((o.recorded_at, v))

    # Sort each metric chronologically
    for m in obs_by_metric:
        obs_by_metric[m].sort(key=lambda x: x[0])

    # Latest value per metric
    latest: Dict[str, float] = {m: vs[-1][1] for m, vs in obs_by_metric.items()}

    # ── Baselines (EWM over all readings) ────────────────────────────────────
    baselines: Dict[str, float] = {}
    for m, pts in obs_by_metric.items():
        vals = [v for _, v in pts]
        baselines[m] = round(_ewm_mean(vals), 2)

    # ── Rolling deltas ──────────────────────────────────────────────────────
    rolling_7d: Dict[str, float] = {}
    rolling_30d: Dict[str, float] = {}
    cut7 = now - timedelta(days=7)
    cut30 = now - timedelta(days=30)

    for m, pts in obs_by_metric.items():
        vals_7d = [v for t, v in pts if t >= cut7]
        vals_30d = [v for t, v in pts if t >= cut30]
        all_vals = [v for _, v in pts]
        baseline = baselines[m]
        if vals_7d:
            rolling_7d[m] = round(_delta_pct(_ewm_mean(vals_7d), baseline), 1)
        if vals_30d:
            rolling_30d[m] = round(_delta_pct(_ewm_mean(vals_30d), baseline), 1)

    # ── Variability (coefficient of variation) ────────────────────────────────
    variability: Dict[str, float] = {}
    for m, pts in obs_by_metric.items():
        vals = [v for _, v in pts]
        if len(vals) >= 3 and statistics.mean(vals) != 0:
            variability[m] = round(statistics.stdev(vals) / abs(statistics.mean(vals)), 3)

    # ── Adherence (proxy: recency of observations) ────────────────────────────
    adherence: Dict[str, float] = {}
    for m, pts in obs_by_metric.items():
        last_ts = pts[-1][0]
        days_ago = (now - last_ts).days
        adherence[m] = max(0.0, round(1.0 - min(days_ago / 30, 1.0), 2))

    # ── Anomaly detection ────────────────────────────────────────────────────
    obs_vals_only = {m: [v for _, v in pts] for m, pts in obs_by_metric.items()}
    anomalies = _detect_anomalies(obs_vals_only)

    # ── Risk cards (per domain) ───────────────────────────────────────────────
    risk_cards = _build_risk_cards(latest, rolling_30d, ocean_profile)

    # ── Leading indicators ────────────────────────────────────────────────────
    leading = _build_leading_indicators(latest, rolling_7d, rolling_30d)

    # ── Data quality ─────────────────────────────────────────────────────────
    metrics_count = len(obs_by_metric)
    if metrics_count >= 5:
        quality = "rich"
    elif metrics_count >= 3:
        quality = "moderate"
    elif metrics_count >= 1:
        quality = "sparse"
    else:
        quality = "empty"

    # ── Overall confidence ────────────────────────────────────────────────────
    quality_factor = {"rich": 0.85, "moderate": 0.65, "sparse": 0.40, "empty": 0.05}[quality]
    avg_adherence = statistics.mean(adherence.values()) if adherence else 0.2
    confidence = round(quality_factor * 0.7 + avg_adherence * 0.3, 2)

    # ── Trajectory windows ────────────────────────────────────────────────────
    overall_risk = _overall_risk_level(risk_cards)
    short_term = _build_trajectory_window("short", risk_cards, rolling_7d, confidence)
    mid_term = _build_trajectory_window("mid", risk_cards, rolling_30d, confidence * 0.85)
    long_term = _build_trajectory_window("long", risk_cards, rolling_30d, confidence * 0.65)

    # ── Overall direction ─────────────────────────────────────────────────────
    overall_direction = short_term.direction if short_term else "unknown"

    # ── Next-best measurement ─────────────────────────────────────────────────
    most_recent_per_metric = {m: pts[-1][0] for m, pts in obs_by_metric.items()}
    nbm = _next_best(most_recent_per_metric, now)

    # ── OCEAN behavioral modifiers ────────────────────────────────────────────
    behavioral_modifiers = None
    ocean_version = None
    if ocean_profile:
        behavioral_modifiers = compute_behavioral_modifiers(ocean_profile.scores)
        ocean_version = ocean_profile.version

    # ── freshness ─────────────────────────────────────────────────────────────
    last_obs_ts = max((pts[-1][0] for pts in obs_by_metric.values()), default=now)
    freshness_seconds = int((now - last_obs_ts).total_seconds())

    # ── Build DHT ─────────────────────────────────────────────────────────────
    dht = DelphiHealthTrajectory(
        person_id=person_id,
        family_id=family_id,
        computed_at=now,
        data_freshness_seconds=freshness_seconds,
        observation_count=len(obs),
        data_quality=quality,
        baselines=baselines,
        rolling_deltas_7d=rolling_7d,
        rolling_deltas_30d=rolling_30d,
        variability=variability,
        adherence_signals=adherence,
        trend_breaks=[],           # populated separately if needed
        anomalies=anomalies,
        context_tags=context_tags or [],
        short_term=short_term,
        mid_term=mid_term,
        long_term=long_term,
        overall_direction=overall_direction,
        risk_cards=risk_cards,
        leading_indicators=leading,
        next_best_measurement=nbm,
        confidence=confidence,
        uncertainty_lower=max(0.0, confidence - 0.15),
        uncertainty_upper=min(1.0, confidence + 0.15),
        ocean_version=ocean_version,
        behavioral_modifiers=behavioral_modifiers,
        saint_notes=[],
    )

    return dht


# ─────────────────────────────────────────────────────────────────────────────
# Risk card builder
# ─────────────────────────────────────────────────────────────────────────────

def _build_risk_cards(
    latest: Dict[str, float],
    delta_30d: Dict[str, float],
    ocean_profile: Optional[OceanProfile],
) -> List[RiskCard]:
    cards: List[RiskCard] = []
    ocean_n = ocean_profile.scores.N if ocean_profile else 50.0

    for metric, cfg in _RISK_THRESHOLDS.items():
        val = latest.get(metric)
        if val is None:
            continue

        level = _risk_level_for_metric(metric, val)
        delta = delta_30d.get(metric, 0.0)
        hib = cfg.get("higher_is_better", True)
        arrow = _arrow(delta, hib)

        # Ocean modifier: high N inflates perceived risk slightly (+0–0.15)
        ocean_mod = round((ocean_n - 50) / 333, 2)   # max ±0.15

        # Suggested action
        action = _suggested_action(metric, level, hib)

        movers = []
        if abs(delta) > 5:
            movers.append(f"{cfg['label']} changed {delta:+.1f}% over 30d")

        cards.append(RiskCard(
            domain=cfg["domain"],
            current_level=level,
            direction=arrow,
            delta_30d=delta,
            what_moved_it=movers,
            confidence=0.75 if level != "low" else 0.85,
            ocean_modifier=ocean_mod,
            suggested_action=action,
        ))

    # Sort: critical first
    cards.sort(key=lambda c: -_risk_level_ord(c.current_level))
    return cards


def _suggested_action(metric: str, level: RiskLevel, hib: bool) -> Optional[str]:
    if level == "low":
        return None
    actions = {
        "hrv_ms": "Prioritise sleep and stress management to improve HRV.",
        "resting_hr": "Add 20 min aerobic activity 3×/week.",
        "steps": "Aim for 500 extra steps per day this week.",
        "sleep_hours": "Set a consistent bedtime — target 7–9 hours.",
        "glucose_fasting": "Reduce refined carbs; schedule a fasting glucose test.",
        "spo2": "Consult clinician if consistently below 94%.",
        "systolic_bp": "Reduce sodium, increase potassium; re-check in 2 weeks.",
        "bmi": "Consult a dietitian; set a 1–2 lb/week target.",
    }
    return actions.get(metric)


# ─────────────────────────────────────────────────────────────────────────────
# Leading indicators builder
# ─────────────────────────────────────────────────────────────────────────────

def _build_leading_indicators(
    latest: Dict[str, float],
    delta_7d: Dict[str, float],
    delta_30d: Dict[str, float],
) -> List[Indicator]:
    indicators: List[Indicator] = []
    for metric in _LEADING_METRIC_ORDER:
        val = latest.get(metric)
        if val is None:
            continue
        cfg = _RISK_THRESHOLDS.get(metric, {})
        level = _risk_level_for_metric(metric, val)
        d7 = delta_7d.get(metric, 0.0)
        d30 = delta_30d.get(metric, 0.0)
        hib = cfg.get("higher_is_better", True)
        arrow = _arrow(d7, hib)
        impact: Any
        if level == "low":
            impact = "positive"
        elif level in ("high", "critical"):
            impact = "negative"
        else:
            impact = "neutral"
        indicators.append(Indicator(
            metric=metric,
            label=cfg.get("label", metric),
            value=round(val, 2),
            unit="",
            trend=arrow,
            impact=impact,
            delta_7d=d7,
            delta_30d=d30,
        ))
        if len(indicators) >= 5:
            break
    return indicators


# ─────────────────────────────────────────────────────────────────────────────
# Trajectory window builder
# ─────────────────────────────────────────────────────────────────────────────

def _build_trajectory_window(
    horizon: str,
    risk_cards: List[RiskCard],
    deltas: Dict[str, float],
    confidence: float,
) -> TrajectoryWindow:
    if not risk_cards:
        return TrajectoryWindow(
            horizon=horizon, direction="unknown", magnitude=0.0, confidence=confidence,
            uncertainty_lower=max(0, confidence - 0.2),
            uncertainty_upper=min(1, confidence + 0.2),
            narrative="Insufficient data to project trajectory.",
        )

    worst = max(risk_cards, key=lambda c: _risk_level_ord(c.current_level))
    improving_count = sum(1 for c in risk_cards if c.direction == "↑") if True else 0

    # Overall direction
    high_risk_count = sum(1 for c in risk_cards if c.current_level in ("high", "critical"))
    if high_risk_count == 0:
        direction = "improving" if improving_count > len(risk_cards) / 2 else "stable"
    elif high_risk_count >= len(risk_cards) / 2:
        direction = "declining"
    else:
        direction = "stable"

    magnitude = round(high_risk_count / max(len(risk_cards), 1), 2)

    narratives = {
        "improving": "Health markers are trending positively across key domains.",
        "stable": "Overall health trajectory is stable — maintain current habits.",
        "declining": f"{high_risk_count} risk area(s) showing concern — see risk cards for detail.",
        "critical": "Multiple critical health indicators require immediate attention.",
        "unknown": "Not enough data to assess this trajectory window.",
    }

    key_drivers = [c.domain for c in risk_cards if c.current_level in ("high", "critical")][:3]

    return TrajectoryWindow(
        horizon=horizon,
        direction=direction,
        magnitude=magnitude,
        confidence=round(confidence, 2),
        uncertainty_lower=round(max(0, confidence - 0.15), 2),
        uncertainty_upper=round(min(1, confidence + 0.15), 2),
        narrative=narratives.get(direction, ""),
        key_drivers=key_drivers,
    )


# ─────────────────────────────────────────────────────────────────────────────
# Overall risk summary
# ─────────────────────────────────────────────────────────────────────────────

def _overall_risk_level(risk_cards: List[RiskCard]) -> RiskLevel:
    if not risk_cards:
        return "low"
    return max(risk_cards, key=lambda c: _risk_level_ord(c.current_level)).current_level


# ─────────────────────────────────────────────────────────────────────────────
# Next-best measurement
# ─────────────────────────────────────────────────────────────────────────────

def _next_best(
    most_recent: Dict[str, datetime],
    now: datetime,
) -> Optional[NextBestMeasurement]:
    best: Optional[Tuple[str, str, str, int, int]] = None  # (metric, label, source, stale, days)

    for metric, label, source, max_days in _NEXT_BEST_PRIORITY:
        last = most_recent.get(metric)
        if last is None:
            days_ago = 9999
        else:
            days_ago = (now - last).days

        stale_by = days_ago - max_days
        if stale_by > 0:
            if best is None or stale_by > best[3]:
                best = (metric, label, source, stale_by, days_ago)

    if best is None:
        return None

    metric, label, source, stale_by, days_ago = best
    # Uncertainty reduction estimate (heuristic)
    unc_reduction = min(55, 10 + stale_by * 2)

    return NextBestMeasurement(
        metric=metric,
        label=label,
        reason=f"Last measured {days_ago} days ago (threshold: {days_ago - stale_by}d). "
               f"This measurement would reduce trajectory uncertainty by ~{unc_reduction}%.",
        uncertainty_reduction_pct=float(unc_reduction),
        days_since_last=days_ago if days_ago < 9999 else None,
        suggested_source=source,
    )
