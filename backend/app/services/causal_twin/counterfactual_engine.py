"""
Counterfactual Forecasting Engine for Health Causal Twin.
Simulates multiple likely outcomes based on behavior changes
and shows projected effects across key health metrics.
"""
import random
from typing import Dict, Any, List, Optional
from datetime import datetime, timedelta
from app.services.causal_twin.uncertainty_engine import uncertainty_engine
from app.services.causal_twin.safety_guardrails import safety_guardrails, WELLNESS_DISCLAIMER
from app.ai.llm_client import get_llm_client


# Metric baselines for simulation (used when user has no historical data)
DEFAULT_BASELINES = {
    "resting_hr":          {"mean": 68, "std": 5, "unit": "bpm", "direction": "lower_better"},
    "hrv":                 {"mean": 45, "std": 12, "unit": "ms", "direction": "higher_better"},
    "sleep_quality":       {"mean": 72, "std": 10, "unit": "%", "direction": "higher_better"},
    "glucose_variability": {"mean": 22, "std": 8, "unit": "mg/dL", "direction": "lower_better"},
    "mood":                {"mean": 6.5, "std": 1.5, "unit": "/10", "direction": "higher_better"},
    "energy":              {"mean": 6.0, "std": 1.8, "unit": "/10", "direction": "higher_better"},
    "recovery_score":      {"mean": 70, "std": 12, "unit": "%", "direction": "higher_better"},
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
        "sleep_quality":  {"per_unit": 3.0, "delay_days": 2},  # Earlier cutoff = better
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
}

HORIZONS = [3, 7, 14, 30]


class CounterfactualEngine:
    """Simulates multiple futures based on behavior changes."""

    def __init__(self):
        self.llm = get_llm_client()

    async def simulate_scenarios(
        self,
        user_id: str,
        behavior_changes: Dict[str, float],
        target_metrics: Optional[List[str]] = None,
        horizons: Optional[List[int]] = None,
        user_history_days: int = 0,
        data_completeness: float = 0.0
    ) -> Dict[str, Any]:
        """
        Run a counterfactual simulation.

        Args:
            user_id: User identifier
            behavior_changes: e.g. {"sleep_hours": 7.5, "steps": 8000}
            target_metrics: Specific metrics to project (None = all affected)
            horizons: Days to forecast at (default: [3, 7, 14, 30])
            user_history_days: Days of historical data available
            data_completeness: 0.0-1.0 fraction of expected data present
        """
        horizons = horizons or HORIZONS
        affected_metrics = set()

        # Discover which metrics are affected
        for behavior, _value in behavior_changes.items():
            effects = BEHAVIOR_EFFECT_MAP.get(behavior, {})
            affected_metrics.update(effects.keys())

        if target_metrics:
            affected_metrics = affected_metrics.intersection(set(target_metrics))

        if not affected_metrics:
            affected_metrics = set(DEFAULT_BASELINES.keys())

        # Build projections per metric
        projections = {}
        for metric in affected_metrics:
            baseline = DEFAULT_BASELINES.get(metric, {"mean": 50, "std": 10, "unit": "", "direction": "higher_better"})
            metric_projections = {}

            for horizon in horizons:
                # Compute expected effect from all behavior changes
                total_effect = 0.0
                contributing_behaviors = []
                for behavior, change_value in behavior_changes.items():
                    effect_info = BEHAVIOR_EFFECT_MAP.get(behavior, {}).get(metric)
                    if effect_info:
                        # Effect scales with horizon (capped at delay)
                        active_days = max(0, horizon - effect_info["delay_days"])
                        daily_effect = effect_info["per_unit"] * change_value
                        effect = daily_effect * min(active_days, horizon) / horizon
                        total_effect += effect
                        contributing_behaviors.append(behavior)

                # Add noise based on confidence
                noise_factor = max(0.05, 1.0 - (data_completeness * 0.7))
                noise = random.gauss(0, baseline["std"] * noise_factor * 0.3)

                mid = baseline["mean"] + total_effect + noise
                band_width = baseline["std"] * noise_factor * (1 + horizon / 30)

                metric_projections[f"{horizon}d"] = {
                    "low": round(mid - band_width, 1),
                    "mid": round(mid, 1),
                    "high": round(mid + band_width, 1),
                    "unit": baseline["unit"],
                    "direction": baseline["direction"],
                    "contributing_behaviors": contributing_behaviors
                }

            projections[metric] = metric_projections

        # Confidence assessment
        confidence = uncertainty_engine.assess_confidence(
            data_days=user_history_days,
            data_completeness=data_completeness,
            has_experiment=False
        )

        # Evidence type labeling
        evidence = uncertainty_engine.label_evidence_type(
            has_experiment=False,
            correlation_strength=data_completeness * 0.6
        )

        # LLM narrative summary
        narrative = await self._generate_narrative(behavior_changes, projections, confidence)

        return {
            "scenario": behavior_changes,
            "projections": projections,
            "horizons": horizons,
            "confidence": confidence,
            "evidence": evidence,
            "narrative": narrative,
            "disclaimer": WELLNESS_DISCLAIMER,
            "generated_at": datetime.utcnow().isoformat()
        }

    async def _generate_narrative(
        self,
        behavior_changes: Dict[str, float],
        projections: Dict[str, Any],
        confidence: Dict[str, Any]
    ) -> str:
        """Use LLM to generate a human-friendly summary of the forecast."""
        changes_text = ", ".join([f"{k}: {v}" for k, v in behavior_changes.items()])
        metrics_text = ", ".join(projections.keys())

        prompt = (
            f"You are St. Raphael, a compassionate health guardian. Summarize this counterfactual "
            f"health forecast in 2-3 sentences, using warm but precise language.\n\n"
            f"Behavior changes: {changes_text}\n"
            f"Affected metrics: {metrics_text}\n"
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
