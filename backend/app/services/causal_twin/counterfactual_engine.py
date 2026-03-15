"""
Counterfactual Forecasting Engine for Health Causal Twin.
Simulates multiple likely outcomes based on behavior changes
and shows projected effects across key health metrics.
"""
import random
import asyncio
from typing import Dict, Any, List, Optional
from datetime import datetime, timedelta
from sqlalchemy import select, func
from app.services.causal_twin.uncertainty_engine import uncertainty_engine
from app.services.causal_twin.safety_guardrails import safety_guardrails, WELLNESS_DISCLAIMER
from app.ai.llm_client import get_llm_client
from app.db.session import get_session_factory
from app.models.health import Metric

# Metric baselines for simulation (used when user has no historical data)
DEFAULT_BASELINES = {
    "resting_hr":          {"mean": 68.0, "std": 5.0, "unit": "bpm", "direction": "lower_better"},
    "hrv":                 {"mean": 45.0, "std": 12.0, "unit": "ms", "direction": "higher_better"},
    "sleep_quality":       {"mean": 72.0, "std": 10.0, "unit": "%", "direction": "higher_better"},
    "glucose_variability": {"mean": 22.0, "std": 8.0, "unit": "mg/dL", "direction": "lower_better"},
    "mood":                {"mean": 6.5, "std": 1.5, "unit": "/10", "direction": "higher_better"},
    "energy":              {"mean": 6.0, "std": 1.8, "unit": "/10", "direction": "higher_better"},
    "recovery_score":      {"mean": 70.0, "std": 12.0, "unit": "%", "direction": "higher_better"},
    "stress_load":         {"mean": 4.5, "std": 1.5, "unit": "/10", "direction": "lower_better"},
    "focus_stability":     {"mean": 62.0, "std": 11.0, "unit": "%", "direction": "higher_better"},
}

# Mapping internal names to Metric model types
METRIC_MAPPING = {
    "resting_hr": "HEART_RATE",
    "hrv": "HRV",
    "sleep_quality": "SLEEP_DURATION", # Simplified
    "glucose_variability": "GLUCOSE",
    "steps": "STEPS"
}

BEHAVIOR_BASELINES = {
    "sleep_hours": {"default": 7.0, "direction": "increase"},
    "steps": {"default": 6000.0, "direction": "increase"},
    "caffeine_cutoff_hour": {"default": 15.0, "direction": "decrease"},
    "hydration_liters": {"default": 2.0, "direction": "increase"},
    "meditation_minutes": {"default": 5.0, "direction": "increase"},
    "strength_sessions_per_week": {"default": 1.0, "direction": "increase"},
    "evening_screen_hours": {"default": 2.5, "direction": "decrease"},
    "sunlight_minutes": {"default": 20.0, "direction": "increase"},
    "meal_regularity_score": {"default": 5.0, "direction": "increase"},
    "stress_load": {"default": 5.0, "direction": "decrease"},
}

# How behavior changes map to metric effects (simplified causal model)
BEHAVIOR_EFFECT_MAP = {
    "sleep_hours": {
        "resting_hr":     {"per_unit": -0.8, "delay_days": 3},
        "hrv":            {"per_unit": 3.5, "delay_days": 5},
        "sleep_quality":  {"per_unit": 6.0, "delay_days": 1},
        "mood":           {"per_unit": 0.4, "delay_days": 2},
        "energy":         {"per_unit": 0.5, "delay_days": 1},
        "recovery_score": {"per_unit": 4.0, "delay_days": 3},
    },
    "steps": {
        "resting_hr":          {"per_unit": -0.0003, "delay_days": 7},
        "hrv":                 {"per_unit": 0.001, "delay_days": 10},
        "glucose_variability": {"per_unit": -0.001, "delay_days": 3},
        "energy":              {"per_unit": 0.0002, "delay_days": 2},
        "recovery_score":      {"per_unit": 0.002, "delay_days": 5},
    },
    "caffeine_cutoff_hour": {
        "sleep_quality":  {"per_unit": 3.0, "delay_days": 2},
        "hrv":            {"per_unit": 1.5, "delay_days": 5},
        "resting_hr":     {"per_unit": -0.5, "delay_days": 3},
    },
    "hydration_liters": {
        "energy":              {"per_unit": 0.8, "delay_days": 1},
        "glucose_variability": {"per_unit": -2.0, "delay_days": 3},
        "mood":                {"per_unit": 0.3, "delay_days": 2},
    },
    "meditation_minutes": {
        "hrv":       {"per_unit": 0.3, "delay_days": 7},
        "mood":      {"per_unit": 0.08, "delay_days": 3},
        "energy":    {"per_unit": 0.05, "delay_days": 5},
    },
    "strength_sessions_per_week": {
        "resting_hr":     {"per_unit": -0.6, "delay_days": 7},
        "hrv":            {"per_unit": 2.0, "delay_days": 10},
        "energy":         {"per_unit": 0.25, "delay_days": 3},
        "recovery_score": {"per_unit": 1.6, "delay_days": 6},
    },
    "evening_screen_hours": {
        "sleep_quality":  {"per_unit": -4.5, "delay_days": 1},
        "mood":           {"per_unit": -0.15, "delay_days": 2},
        "energy":         {"per_unit": -0.1, "delay_days": 2},
        "focus_stability": {"per_unit": -2.8, "delay_days": 1},
    },
    "sunlight_minutes": {
        "mood":           {"per_unit": 0.012, "delay_days": 2},
        "energy":         {"per_unit": 0.015, "delay_days": 2},
        "sleep_quality":  {"per_unit": 0.06, "delay_days": 3},
        "focus_stability": {"per_unit": 0.08, "delay_days": 2},
    },
    "meal_regularity_score": {
        "glucose_variability": {"per_unit": -0.9, "delay_days": 3},
        "energy":              {"per_unit": 0.12, "delay_days": 2},
        "mood":                {"per_unit": 0.08, "delay_days": 2},
        "recovery_score":      {"per_unit": 0.5, "delay_days": 3},
    },
    "stress_load": {
        "resting_hr":          {"per_unit": 1.2, "delay_days": 1},
        "hrv":                 {"per_unit": -2.8, "delay_days": 2},
        "sleep_quality":       {"per_unit": -3.6, "delay_days": 1},
        "glucose_variability": {"per_unit": 1.6, "delay_days": 2},
        "mood":                {"per_unit": -0.35, "delay_days": 1},
        "energy":              {"per_unit": -0.25, "delay_days": 1},
        "recovery_score":      {"per_unit": -2.2, "delay_days": 2},
        "focus_stability":     {"per_unit": -1.8, "delay_days": 1},
    },
}

HORIZONS = [3, 7, 14, 30]

class CounterfactualEngine:
    """Simulates multiple futures based on behavior changes and real historical data."""

    def __init__(self):
        self.llm = get_llm_client()

    async def _get_user_baselines(self, user_id: str, days: int = 30) -> Dict[str, Any]:
        """Compute personal baselines from the metrics table."""
        baselines = DEFAULT_BASELINES.copy()
        start_date = datetime.utcnow() - timedelta(days=days)
        
        session_factory = get_session_factory()
        async with session_factory() as session:
            for metric_key, metric_type in METRIC_MAPPING.items():
                if metric_key not in baselines:
                    continue
                
                query = select(
                    func.avg(Metric.value).label("avg"),
                    func.stddev(Metric.value).label("std")
                ).where(
                    Metric.sourceId == user_id, # Simplified userId check
                    Metric.type == metric_type,
                    Metric.ts >= start_date
                )
                
                result = await session.execute(query)
                row = result.fetchone()
                
                if row and row.avg is not None:
                    baselines[metric_key]["mean"] = float(row.avg)
                    if row.std is not None and row.std > 0:
                        baselines[metric_key]["std"] = float(row.std)
        
        return baselines

    async def _assess_history_stats(self, user_id: str) -> Dict[str, Any]:
        """Determine data completeness and total history days."""
        session_factory = get_session_factory()
        async with session_factory() as session:
            query = select(
                func.min(Metric.ts).label("first_ts"),
                func.count(Metric.id).label("total_count")
            ).where(Metric.sourceId == user_id)
            
            result = await session.execute(query)
            row = result.fetchone()
            
            history_days = 0
            completeness = 0.0
            
            if row and row.total_count:
                if row.first_ts:
                    history_days = (datetime.utcnow().replace(tzinfo=row.first_ts.tzinfo) - row.first_ts).days
                
                # Arbitrary completeness score: count / (expected per day * days)
                # Ensure we don't divide by zero
                divisor = max(1, 24 * history_days)
                completeness = min(1.0, float(row.total_count) / divisor)
            
            return {"history_days": int(history_days), "completeness": float(completeness)}

    def _get_behavior_baselines(self, user_baselines: Dict[str, Any]) -> Dict[str, float]:
        return {
            "sleep_hours": float(user_baselines.get("sleep_quality", {}).get("mean", BEHAVIOR_BASELINES["sleep_hours"]["default"])) / 10.0,
            "steps": float(user_baselines.get("steps", {}).get("mean", BEHAVIOR_BASELINES["steps"]["default"])),
            "caffeine_cutoff_hour": BEHAVIOR_BASELINES["caffeine_cutoff_hour"]["default"],
            "hydration_liters": BEHAVIOR_BASELINES["hydration_liters"]["default"],
            "meditation_minutes": BEHAVIOR_BASELINES["meditation_minutes"]["default"],
            "strength_sessions_per_week": BEHAVIOR_BASELINES["strength_sessions_per_week"]["default"],
            "evening_screen_hours": BEHAVIOR_BASELINES["evening_screen_hours"]["default"],
            "sunlight_minutes": BEHAVIOR_BASELINES["sunlight_minutes"]["default"],
            "meal_regularity_score": BEHAVIOR_BASELINES["meal_regularity_score"]["default"],
            "stress_load": BEHAVIOR_BASELINES["stress_load"]["default"],
        }

    def _behavior_delta(self, behavior: str, target_value: float, behavior_baselines: Dict[str, float]) -> float:
        baseline = float(behavior_baselines.get(behavior, BEHAVIOR_BASELINES.get(behavior, {}).get("default", 0.0)))
        direction = BEHAVIOR_BASELINES.get(behavior, {}).get("direction", "increase")
        return float(target_value - baseline) if direction == "increase" else float(baseline - target_value)

    @staticmethod
    def _clamp(value: float, low: float = 0.0, high: float = 100.0) -> float:
        return max(low, min(high, value))

    @staticmethod
    def _scaled(value: Optional[float], low: float, high: float, higher_is_better: bool = True) -> float:
        if value is None:
            return 50.0
        span = max(high - low, 1e-6)
        raw = ((value - low) / span) * 100.0
        score = raw if higher_is_better else 100.0 - raw
        return CounterfactualEngine._clamp(score)

    def _mid_value(self, projections: Dict[str, Any], metric: str, horizon_key: str) -> Optional[float]:
        return projections.get(metric, {}).get(horizon_key, {}).get("mid")

    def _build_composite_indices(
        self,
        projections: Dict[str, Any],
        behavior_changes: Dict[str, float],
        behavior_baselines: Dict[str, float],
        horizons_list: List[int],
    ) -> Dict[str, Any]:
        indices: Dict[str, Any] = {}

        for horizon in horizons_list:
            horizon_key = f"{horizon}d"
            stress_target = behavior_changes.get("stress_load", behavior_baselines.get("stress_load", 5.0))
            screen_target = behavior_changes.get("evening_screen_hours", behavior_baselines.get("evening_screen_hours", 2.5))
            sunlight_target = behavior_changes.get("sunlight_minutes", behavior_baselines.get("sunlight_minutes", 20.0))
            meal_target = behavior_changes.get("meal_regularity_score", behavior_baselines.get("meal_regularity_score", 5.0))

            recovery_capacity = (
                self._scaled(self._mid_value(projections, "sleep_quality", horizon_key), 45, 95, True) * 0.30
                + self._scaled(self._mid_value(projections, "hrv", horizon_key), 15, 85, True) * 0.25
                + self._scaled(self._mid_value(projections, "recovery_score", horizon_key), 35, 95, True) * 0.30
                + self._scaled(self._mid_value(projections, "energy", horizon_key), 2, 10, True) * 0.15
            )
            metabolic_resilience = (
                self._scaled(self._mid_value(projections, "glucose_variability", horizon_key), 10, 45, False) * 0.40
                + self._scaled(self._mid_value(projections, "steps", horizon_key), 2000, 14000, True) * 0.20
                + self._scaled(self._mid_value(projections, "energy", horizon_key), 2, 10, True) * 0.20
                + self._scaled(meal_target, 1, 10, True) * 0.20
            )
            cognitive_clarity = (
                self._scaled(self._mid_value(projections, "focus_stability", horizon_key), 35, 95, True) * 0.35
                + self._scaled(self._mid_value(projections, "mood", horizon_key), 2, 10, True) * 0.20
                + self._scaled(self._mid_value(projections, "energy", horizon_key), 2, 10, True) * 0.20
                + self._scaled(sunlight_target, 0, 120, True) * 0.10
                + self._scaled(screen_target, 0, 5, False) * 0.15
            )
            autonomic_balance = (
                self._scaled(self._mid_value(projections, "resting_hr", horizon_key), 55, 95, False) * 0.35
                + self._scaled(self._mid_value(projections, "hrv", horizon_key), 15, 85, True) * 0.35
                + self._scaled(stress_target, 1, 10, False) * 0.15
                + self._scaled(self._mid_value(projections, "sleep_quality", horizon_key), 45, 95, True) * 0.15
            )
            routine_stability = (
                self._scaled(behavior_changes.get("sleep_hours", behavior_baselines.get("sleep_hours", 7.0)), 4, 10, True) * 0.20
                + self._scaled(behavior_changes.get("steps", behavior_baselines.get("steps", 6000.0)), 2000, 15000, True) * 0.20
                + self._scaled(meal_target, 1, 10, True) * 0.20
                + self._scaled(screen_target, 0, 5, False) * 0.20
                + self._scaled(behavior_changes.get("meditation_minutes", behavior_baselines.get("meditation_minutes", 5.0)), 0, 30, True) * 0.20
            )

            indices[horizon_key] = {
                "recovery_capacity": round(recovery_capacity, 1),
                "metabolic_resilience": round(metabolic_resilience, 1),
                "cognitive_clarity": round(cognitive_clarity, 1),
                "autonomic_balance": round(autonomic_balance, 1),
                "routine_stability": round(routine_stability, 1),
            }

        return indices

    def _build_downstream_equations(
        self,
        composite_indices: Dict[str, Any],
        confidence: Dict[str, Any],
        completeness: float,
    ) -> Dict[str, Any]:
        mid_term = composite_indices.get("14d") or composite_indices.get("7d") or {}
        short_term = composite_indices.get("3d") or composite_indices.get("7d") or {}

        trajectory_lift = (
            mid_term.get("recovery_capacity", 50.0) * 0.40
            + mid_term.get("autonomic_balance", 50.0) * 0.35
            + mid_term.get("routine_stability", 50.0) * 0.25
        ) - 50.0
        alert_pressure = 100.0 - (
            short_term.get("recovery_capacity", 50.0) * 0.35
            + short_term.get("autonomic_balance", 50.0) * 0.35
            + short_term.get("cognitive_clarity", 50.0) * 0.30
        )
        experiment_readiness = (
            confidence.get("score", 0.0) * 0.35
            + (float(completeness or 0.0) * 100.0) * 0.25
            + mid_term.get("routine_stability", 50.0) * 0.40
        )
        oracle_focus_score = (
            alert_pressure * 0.45
            + (100.0 - mid_term.get("metabolic_resilience", 50.0)) * 0.30
            + (100.0 - mid_term.get("cognitive_clarity", 50.0)) * 0.25
        )

        return {
            "trajectory_lift": {
                "score": round(self._clamp(trajectory_lift + 50.0) - 50.0, 1),
                "label": "Neural trajectory shift",
                "summary": "Feeds Raphael's trajectory and readiness equations.",
            },
            "alert_pressure": {
                "score": round(self._clamp(alert_pressure), 1),
                "label": "Alert pressure",
                "summary": "Feeds risk escalation and Trinity alert pressure.",
            },
            "experiment_readiness": {
                "score": round(self._clamp(experiment_readiness), 1),
                "label": "Experiment readiness",
                "summary": "Feeds N-of-1 experiment confidence and intervention readiness.",
            },
            "oracle_focus": {
                "score": round(self._clamp(oracle_focus_score), 1),
                "label": "Oracle focus priority",
                "summary": "Feeds Raphael's recommendation and follow-up priority ordering.",
            },
        }

    async def simulate_scenarios(
        self,
        user_id: str,
        behavior_changes: Dict[str, float],
        target_metrics: Optional[List[str]] = None,
        horizons: Optional[List[int]] = None,
        user_history_days: Optional[int] = None,
        data_completeness: Optional[float] = None
    ) -> Dict[str, Any]:
        """Run a counterfactual simulation using real user baselines."""
        
        # 1. Fetch real stats if not provided
        if user_history_days is None or data_completeness is None:
            stats = await self._assess_history_stats(user_id)
            user_history_days = user_history_days if user_history_days is not None else stats["history_days"]
            data_completeness = data_completeness if data_completeness is not None else stats["completeness"]
            
        # 2. Get user baselines
        baselines = await self._get_user_baselines(user_id)
        behavior_baselines = self._get_behavior_baselines(baselines)
        behavior_deltas = {
            behavior: round(self._behavior_delta(behavior, value, behavior_baselines), 2)
            for behavior, value in behavior_changes.items()
        }
        
        horizons_list = horizons or HORIZONS
        affected_metrics = set()

        for behavior, _value in behavior_changes.items():
            effects = BEHAVIOR_EFFECT_MAP.get(behavior, {})
            affected_metrics.update(effects.keys())

        if target_metrics:
            affected_metrics = affected_metrics.intersection(set(target_metrics))

        if not affected_metrics:
            affected_metrics = set(baselines.keys())

        projections = {}
        for metric in affected_metrics:
            baseline = baselines.get(metric, {"mean": 50.0, "std": 10.0, "unit": "", "direction": "higher_better"})
            metric_projections = {}

            for horizon in horizons_list:
                total_effect = 0.0
                contributing_behaviors = []
                for behavior, change_value in behavior_changes.items():
                    effect_info = BEHAVIOR_EFFECT_MAP.get(behavior, {}).get(metric)
                    if effect_info:
                        delta = behavior_deltas.get(behavior, 0.0)
                        active_days = float(max(0, horizon - effect_info["delay_days"]))
                        daily_effect = float(effect_info["per_unit"]) * float(delta)
                        effect = daily_effect * min(active_days, float(horizon)) / float(horizon)
                        total_effect += effect
                        if abs(delta) > 1e-6:
                            contributing_behaviors.append(behavior)

                completeness_val = float(data_completeness or 0.0)
                noise_factor = max(0.05, 1.0 - (completeness_val * 0.7))
                std_val = float(baseline.get("std", 10.0))
                noise = random.gauss(0, std_val * noise_factor * 0.3)

                mid = float(baseline.get("mean", 50.0)) + total_effect + noise
                band_width = std_val * noise_factor * (1.0 + float(horizon) / 30.0)

                metric_projections[f"{horizon}d"] = {
                    "low": round(mid - band_width, 1),
                    "mid": round(mid, 1),
                    "high": round(mid + band_width, 1),
                    "unit": baseline.get("unit", ""),
                    "direction": baseline.get("direction", "higher_better"),
                    "contributing_behaviors": contributing_behaviors
                }

            projections[metric] = metric_projections

        composite_indices = self._build_composite_indices(
            projections=projections,
            behavior_changes=behavior_changes,
            behavior_baselines=behavior_baselines,
            horizons_list=horizons_list,
        )

        confidence = uncertainty_engine.assess_confidence(
            data_days=int(user_history_days or 0),
            data_completeness=float(data_completeness or 0.0),
            has_experiment=False
        )

        evidence = uncertainty_engine.label_evidence_type(
            has_experiment=False,
            correlation_strength=float(data_completeness or 0.0) * 0.6
        )

        downstream_equations = self._build_downstream_equations(
            composite_indices=composite_indices,
            confidence=confidence,
            completeness=float(data_completeness or 0.0),
        )

        narrative = await self._generate_narrative(
            behavior_changes=behavior_changes,
            behavior_deltas=behavior_deltas,
            projections=projections,
            composite_indices=composite_indices,
            downstream_equations=downstream_equations,
            confidence=confidence,
        )

        return {
            "scenario": behavior_changes,
            "behavior_baselines": behavior_baselines,
            "behavior_deltas": behavior_deltas,
            "projections": projections,
            "composite_indices": composite_indices,
            "downstream_equations": downstream_equations,
            "horizons": horizons_list,
            "confidence": confidence,
            "evidence": evidence,
            "narrative": narrative,
            "history_days": user_history_days,
            "completeness": data_completeness,
            "disclaimer": WELLNESS_DISCLAIMER,
            "generated_at": datetime.utcnow().isoformat()
        }

    async def _generate_narrative(self, behavior_changes, behavior_deltas, projections, composite_indices, downstream_equations, confidence) -> str:
        """Use LLM to generate a human-friendly summary."""
        changes_text = ", ".join([f"{k}: {v}" for k, v in behavior_changes.items()])
        metrics_text = ", ".join(projections.keys())
        primary_horizon = composite_indices.get("14d") or composite_indices.get("7d") or {}
        downstream_text = ", ".join([f"{key}: {value['score']}" for key, value in downstream_equations.items()])
        deltas_text = ", ".join([f"{key}: {value:+}" for key, value in behavior_deltas.items()])

        prompt = (
            f"You are St. Raphael, a compassionate health guardian. Summarize this counterfactual "
            f"health forecast in 2-3 sentences, using warm but precise language.\n\n"
            f"Behavior changes: {changes_text}\n"
            f"Effective behavior deltas vs baseline: {deltas_text}\n"
            f"Affected metrics: {metrics_text}\n"
            f"Composite indices at 14d: {primary_horizon}\n"
            f"Downstream equations: {downstream_text}\n"
            f"Confidence: {confidence['level']} ({confidence['score']}%)\n"
            f"Keep it encouraging but honest about uncertainty."
        )

        try:
            return await self.llm.generate_response([{"role": "user", "content": prompt}])
        except Exception:
            return (
                f"Based on the proposed changes ({changes_text}), St. Raphael projects "
                f"effects across {len(projections)} metrics over the coming weeks. "
                f"Confidence is {confidence['level']} — more data will sharpen these predictions."
            )

counterfactual_engine = CounterfactualEngine()
