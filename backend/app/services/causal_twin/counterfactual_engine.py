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
}

# Mapping internal names to Metric model types
METRIC_MAPPING = {
    "resting_hr": "HEART_RATE",
    "hrv": "HRV",
    "sleep_quality": "SLEEP_DURATION", # Simplified
    "glucose_variability": "GLUCOSE",
    "steps": "STEPS"
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
                        active_days = float(max(0, horizon - effect_info["delay_days"]))
                        daily_effect = float(effect_info["per_unit"]) * float(change_value)
                        effect = daily_effect * min(active_days, float(horizon)) / float(horizon)
                        total_effect += effect
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

        confidence = uncertainty_engine.assess_confidence(
            data_days=int(user_history_days or 0),
            data_completeness=float(data_completeness or 0.0),
            has_experiment=False
        )

        evidence = uncertainty_engine.label_evidence_type(
            has_experiment=False,
            correlation_strength=float(data_completeness or 0.0) * 0.6
        )

        narrative = await self._generate_narrative(behavior_changes, projections, confidence)

        return {
            "scenario": behavior_changes,
            "projections": projections,
            "horizons": horizons_list,
            "confidence": confidence,
            "evidence": evidence,
            "narrative": narrative,
            "history_days": user_history_days,
            "completeness": data_completeness,
            "disclaimer": WELLNESS_DISCLAIMER,
            "generated_at": datetime.utcnow().isoformat()
        }

    async def _generate_narrative(self, behavior_changes, projections, confidence) -> str:
        """Use LLM to generate a human-friendly summary."""
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
