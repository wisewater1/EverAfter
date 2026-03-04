"""
Background Causal-Twin Simulator — Monte Carlo projection engine.

Runs thousands of micro-simulations per user, jittering current biometrics
by their observed variance and projecting 6-month health trajectories.
Detects invisible compounding risks (e.g., slow HRV decline → burnout)
before they reach clinical thresholds.

Fixes contradiction: metric thresholds now sourced from health_constants.
Glucose threshold is ADA-aligned (warn 100, crit 126) not 110.
Risk-level labels use canonical risk_level() (higher=worse, 4-tier).

Used by both St. Raphael (individual) and St. Joseph (family).
"""

from __future__ import annotations

import math
import random
import uuid
from datetime import datetime, timedelta
from typing import Any, Dict, List, Optional

from app.services.health.health_constants import (
    METRIC_THRESHOLDS as _HC_THRESHOLDS,
    Metric, risk_level,
)

# ── Constants ────────────────────────────────────────────────────

PROJECTION_DAYS = 180          # 6-month forecast horizon
DEFAULT_RUNS    = 500          # Monte Carlo sample count
COMPOUNDING_WINDOW_DAYS = 21   # 3-week window for compounding detection

# Metric threshold adapter: maps engine metric keys → health_constants entry.
# Pulls warn/crit/direction from the canonical METRIC_THRESHOLDS table.
# For "lower_is_worse" metrics the warn field is the *lower* threshold.
METRIC_THRESHOLDS: Dict[str, Dict[str, Any]] = {
    Metric.HRV: {
        "warn":      _HC_THRESHOLDS[Metric.HRV]["warn"],        # 35 ms
        "crit":      _HC_THRESHOLDS[Metric.HRV]["crit"],        # 20 ms
        "direction": _HC_THRESHOLDS[Metric.HRV]["direction"],   # lower_is_worse
    },
    Metric.RESTING_HEART_RATE: {
        "warn":      _HC_THRESHOLDS[Metric.RESTING_HEART_RATE]["warn"],     # 85
        "crit":      _HC_THRESHOLDS[Metric.RESTING_HEART_RATE]["crit"],     # 95
        "direction": _HC_THRESHOLDS[Metric.RESTING_HEART_RATE]["direction"],
    },
    "resting_hr": {  # legacy alias
        "warn": 85, "crit": 95, "direction": "higher_is_worse",
    },
    # Glucose: ADA prediabetic threshold (100), diabetes threshold (126)
    Metric.GLUCOSE: {
        "warn":      _HC_THRESHOLDS[Metric.GLUCOSE]["warn"],       # 100 mg/dL
        "crit":      _HC_THRESHOLDS[Metric.GLUCOSE]["crit"],       # 126 mg/dL
        "direction": _HC_THRESHOLDS[Metric.GLUCOSE]["direction"],
    },
    Metric.SLEEP_DURATION: {
        "warn":      _HC_THRESHOLDS[Metric.SLEEP_DURATION]["warn"],     # 5.5 h
        "crit":      _HC_THRESHOLDS[Metric.SLEEP_DURATION]["crit"],     # 4.5 h
        "direction": _HC_THRESHOLDS[Metric.SLEEP_DURATION]["direction"],
    },
    Metric.STRESS_LEVEL: {
        "warn":      _HC_THRESHOLDS[Metric.STRESS_LEVEL]["warn"],    # 7
        "crit":      _HC_THRESHOLDS[Metric.STRESS_LEVEL]["crit"],    # 9
        "direction": _HC_THRESHOLDS[Metric.STRESS_LEVEL]["direction"],
    },
    Metric.STEPS: {
        "warn":      _HC_THRESHOLDS[Metric.STEPS]["warn"],     # 3000
        "crit":      _HC_THRESHOLDS[Metric.STEPS]["crit"],     # 1500
        "direction": _HC_THRESHOLDS[Metric.STEPS]["direction"],
    },
    Metric.WELLNESS_COMPOSITE: {
        # Composite: lower wellness = higher risk
        "warn": 65, "crit": 45, "direction": "lower_is_worse",
    },
}


# ── Helpers ──────────────────────────────────────────────────────

def _mean(vals: List[float]) -> float:
    return sum(vals) / max(len(vals), 1)


def _std(vals: List[float]) -> float:
    if len(vals) < 2:
        return 0.0
    m = _mean(vals)
    return math.sqrt(sum((v - m) ** 2 for v in vals) / len(vals))


def _percentile(vals: List[float], p: float) -> float:
    """Simple percentile (nearest-rank)."""
    if not vals:
        return 0.0
    s = sorted(vals)
    k = max(0, min(int(len(s) * p / 100), len(s) - 1))
    return s[k]


def _daily_drift_rate(vals: List[float]) -> float:
    """Linear slope per day from an ordered list of daily values."""
    n = len(vals)
    if n < 2:
        return 0.0
    x_mean = (n - 1) / 2
    y_mean = _mean(vals)
    num = sum((i - x_mean) * (v - y_mean) for i, v in enumerate(vals))
    den = sum((i - x_mean) ** 2 for i in range(n))
    return num / den if den else 0.0


# ═════════════════════════════════════════════════════════════════
#  BackgroundSimulator
# ═════════════════════════════════════════════════════════════════

class BackgroundSimulator:
    """
    Monte Carlo projection engine.

    Usage:
        from app.services.causal_twin.background_simulator import background_simulator
        result = await background_simulator.run_simulation(user_id, metrics_history)
    """

    # ── Core simulation ──────────────────────────────────────────

    async def run_simulation(
        self,
        user_id: str,
        metrics_history: List[Dict[str, Any]],
        n_runs: int = DEFAULT_RUNS,
        horizon_days: int = PROJECTION_DAYS,
    ) -> Dict[str, Any]:
        """
        Run *n_runs* Monte Carlo trajectories per metric, each jittered by
        the observed σ, and return the median / P5 / P95 risk envelopes
        plus any compounding-risk alerts.
        """
        # Group history by metric_type
        by_metric: Dict[str, List[float]] = {}
        for m in metrics_history:
            mt = m.get("metric_type", "unknown")
            v = m.get("value")
            if v is not None:
                by_metric.setdefault(mt, []).append(float(v))

        metric_projections: Dict[str, Dict[str, Any]] = {}

        for metric, values in by_metric.items():
            mean = _mean(values)
            sigma = _std(values) or mean * 0.05  # fallback 5% σ
            drift = _daily_drift_rate(values)

            # Run Monte Carlo
            final_values: List[float] = []
            sample_trajectories: List[List[float]] = []

            for _ in range(n_runs):
                trajectory: List[float] = []
                current = values[-1] if values else mean
                for day in range(1, horizon_days + 1):
                    noise = random.gauss(0, sigma * 0.1)  # daily jitter
                    current = current + drift + noise
                    if day % 7 == 0:  # sample weekly
                        trajectory.append(round(current, 2))
                final_values.append(current)
                if len(sample_trajectories) < 3:
                    sample_trajectories.append(trajectory)

            metric_projections[metric] = {
                "current_mean": round(mean, 2),
                "current_std": round(sigma, 2),
                "drift_per_day": round(drift, 4),
                "projected_median": round(_percentile(final_values, 50), 2),
                "projected_p5": round(_percentile(final_values, 5), 2),
                "projected_p95": round(_percentile(final_values, 95), 2),
                "sample_trajectories": sample_trajectories,
                "horizon_days": horizon_days,
                "n_runs": n_runs,
            }

        # Detect compounding risks
        compounding_alerts = self._detect_compounding_risks(by_metric, metric_projections)

        # Overall risk envelope
        proj_medians = [p["projected_median"] for p in metric_projections.values()]
        overall_risk = self._aggregate_risk(metric_projections)

        return {
            "simulation_id": str(uuid.uuid4()),
            "user_id": user_id,
            "generated_at": datetime.utcnow().isoformat(),
            "horizon_days": horizon_days,
            "n_runs": n_runs,
            "metric_projections": metric_projections,
            "overall_risk_score": overall_risk["score"],
            "overall_risk_level": overall_risk["level"],
            "compounding_alerts": compounding_alerts,
            "recommendations": self._generate_sim_recommendations(
                compounding_alerts, metric_projections
            ),
        }

    # ── Get background insights (public) ─────────────────────────

    async def get_background_insights(
        self,
        user_id: str,
        metrics_history: List[Dict[str, Any]],
    ) -> Dict[str, Any]:
        """
        High-level summary endpoint. Runs a simulation and returns
        actionable insights.
        """
        sim = await self.run_simulation(user_id, metrics_history)

        insights: List[Dict[str, Any]] = []

        # Convert compounding alerts to plain-English insights
        for alert in sim.get("compounding_alerts", []):
            insights.append({
                "type": "compounding_risk",
                "severity": alert["severity"],
                "title": f"Silent {alert['metric'].replace('_', ' ').title()} Drift",
                "description": alert["message"],
                "metric": alert["metric"],
                "projected_breach_day": alert.get("breach_day"),
            })

        # Add metric-specific trajectory insights
        for metric, proj in sim.get("metric_projections", {}).items():
            threshold = METRIC_THRESHOLDS.get(metric)
            if not threshold:
                continue
            median = proj["projected_median"]
            direction = threshold["direction"]
            warn = threshold["warn"]
            if (direction == "higher_is_worse" and median > warn) or \
               (direction == "lower_is_worse" and median < warn):
                insights.append({
                    "type": "trajectory_warning",
                    "severity": "moderate",
                    "title": f"{metric.replace('_', ' ').title()} Trajectory Concern",
                    "description": (
                        f"Monte Carlo simulation projects your {metric.replace('_', ' ')} "
                        f"median to reach {median} over the next {proj['horizon_days']} days "
                        f"(warning threshold: {warn})."
                    ),
                    "metric": metric,
                    "projected_value": median,
                })

        return {
            "user_id": user_id,
            "generated_at": sim["generated_at"],
            "simulation_id": sim["simulation_id"],
            "overall_risk_score": sim["overall_risk_score"],
            "overall_risk_level": sim["overall_risk_level"],
            "insights": insights,
            "recommendations": sim["recommendations"],
        }

    # ── Private helpers ───────────────────────────────────────────

    def _detect_compounding_risks(
        self,
        by_metric: Dict[str, List[float]],
        projections: Dict[str, Dict[str, Any]],
    ) -> List[Dict[str, Any]]:
        """
        Scan for slow-burn patterns: metrics that are individually sub-clinical
        but compound over time to breach thresholds.
        """
        alerts: List[Dict[str, Any]] = []

        for metric, proj in projections.items():
            threshold = METRIC_THRESHOLDS.get(metric)
            if not threshold:
                continue

            drift = proj["drift_per_day"]
            current = proj["current_mean"]
            direction = threshold["direction"]
            warn = threshold["warn"]
            crit = threshold["crit"]

            # Is the metric drifting *toward* the danger zone?
            drifting_toward_danger = (
                (direction == "higher_is_worse" and drift > 0.01) or
                (direction == "lower_is_worse" and drift < -0.01)
            )

            if not drifting_toward_danger:
                continue

            # Estimate days until warning threshold
            if direction == "higher_is_worse":
                gap = warn - current
                days_to_warn = gap / drift if drift > 0 else float("inf")
                gap_crit = crit - current
                days_to_crit = gap_crit / drift if drift > 0 else float("inf")
            else:
                gap = current - warn
                days_to_warn = gap / abs(drift) if drift < 0 else float("inf")
                gap_crit = current - crit
                days_to_crit = gap_crit / abs(drift) if drift < 0 else float("inf")

            # Only alert if breach is within projection horizon
            if days_to_warn <= PROJECTION_DAYS:
                severity = "high" if days_to_crit <= PROJECTION_DAYS else "moderate"
                alerts.append({
                    "alert_id": str(uuid.uuid4()),
                    "metric": metric,
                    "severity": severity,
                    "current_value": round(current, 2),
                    "drift_per_day": round(drift, 4),
                    "projected_warn_breach": round(days_to_warn),
                    "projected_crit_breach": round(days_to_crit) if days_to_crit <= PROJECTION_DAYS else None,
                    "breach_day": round(days_to_warn),
                    "message": (
                        f"{metric.replace('_', ' ').title()} is silently drifting at "
                        f"{abs(drift):.3f}/day. At this rate, you'll cross the warning "
                        f"threshold (~{warn}) in ~{round(days_to_warn)} days."
                    ),
                })

        return alerts

    def _aggregate_risk(
        self,
        projections: Dict[str, Dict[str, Any]],
    ) -> Dict[str, Any]:
        """Aggregate per-metric projections into an overall risk score."""
        risk_scores: List[float] = []

        for metric, proj in projections.items():
            threshold = METRIC_THRESHOLDS.get(metric)
            if not threshold:
                continue

            median = proj["projected_median"]
            direction = threshold["direction"]
            warn = threshold["warn"]
            crit = threshold["crit"]

            if direction == "higher_is_worse":
                if median >= crit:
                    risk_scores.append(90)
                elif median >= warn:
                    frac = (median - warn) / max(crit - warn, 1) * 40 + 50
                    risk_scores.append(min(frac, 89))
                else:
                    risk_scores.append(max(10, median / warn * 40))
            else:  # lower_is_worse
                if median <= crit:
                    risk_scores.append(90)
                elif median <= warn:
                    frac = (warn - median) / max(warn - crit, 1) * 40 + 50
                    risk_scores.append(min(frac, 89))
                else:
                    risk_scores.append(max(10, (1 - median / (warn * 2)) * 40))

        score = _mean(risk_scores) if risk_scores else 25.0
        score = max(0, min(100, score))
        return {"score": round(score, 1), "level": risk_level(score)}

    def _generate_sim_recommendations(
        self,
        alerts: List[Dict[str, Any]],
        projections: Dict[str, Dict[str, Any]],
    ) -> List[str]:
        recs: List[str] = []

        for alert in alerts:
            metric = alert["metric"]
            if "heart_rate_variability" in metric:
                recs.append(
                    "Your HRV is silently declining. Prioritise recovery: "
                    "reduce training intensity and ensure 7+ hours of quality sleep."
                )
            elif "sleep" in metric:
                recs.append(
                    "Sleep duration is trending downward. Set a consistent bedtime "
                    "and limit screen exposure 1 hour before sleep."
                )
            elif "glucose" in metric:
                recs.append(
                    "Glucose levels are creeping upward. Reduce refined carbohydrate "
                    "intake and add a 15-minute post-meal walk."
                )
            elif "heart_rate" in metric or "resting" in metric:
                recs.append(
                    "Resting heart rate is gradually rising. This can indicate "
                    "overtraining or chronic stress — consider active-recovery days."
                )
            elif "stress" in metric:
                recs.append(
                    "Stress markers are compounding. Introduce daily micro-breaks: "
                    "5 minutes of box breathing every 2 hours."
                )
            else:
                recs.append(
                    f"{metric.replace('_', ' ').title()} is drifting. "
                    f"Monitor closely and consult your healthcare provider."
                )

        if not recs:
            recs.append(
                "Background simulations show stable trajectories — "
                "keep maintaining your current habits."
            )

        return recs[:5]  # Cap at 5


# ── Singleton ────────────────────────────────────────────────────

background_simulator = BackgroundSimulator()
