"""
N-of-1 Experiment Engine for Health Causal Twin.
Creates, manages, and analyzes personalized A/B lifestyle experiments.
"""
import random
import uuid
from typing import Dict, Any, List, Optional
from datetime import datetime, timedelta
from app.services.causal_twin.safety_guardrails import safety_guardrails
from app.services.causal_twin.uncertainty_engine import uncertainty_engine
from app.ai.llm_client import get_llm_client


class ExperimentEngine:
    """Manages the full lifecycle of N-of-1 micro-randomized experiments."""

    def __init__(self):
        self.llm = get_llm_client()
        # In-memory store for prototyping (production: use DB models)
        self._experiments: Dict[str, Dict[str, Any]] = {}

    def create_experiment(
        self,
        user_id: str,
        name: str,
        intervention_a: str,
        intervention_b: str,
        outcome_metrics: List[str],
        duration_days: int = 14,
        description: str = ""
    ) -> Dict[str, Any]:
        """
        Create a new N-of-1 experiment with safety validation.
        """
        # Safety check
        safety_check = safety_guardrails.validate_experiment(
            intervention_a, intervention_b, outcome_metrics
        )
        if not safety_check["approved"]:
            return {
                "created": False,
                "error": safety_check["reason"],
                "blocked_keywords": safety_check.get("blocked_keywords", [])
            }

        # Generate randomized A/B schedule
        schedule = self._generate_schedule(duration_days)

        experiment_id = str(uuid.uuid4())
        experiment = {
            "id": experiment_id,
            "user_id": user_id,
            "name": name,
            "description": description,
            "intervention_a": intervention_a,
            "intervention_b": intervention_b,
            "outcome_metrics": outcome_metrics,
            "duration_days": duration_days,
            "status": "draft",
            "schedule": schedule,
            "adherence_log": [],
            "results": None,
            "safety_approved": True,
            "created_at": datetime.utcnow().isoformat(),
            "started_at": None,
            "completed_at": None
        }

        self._experiments[experiment_id] = experiment
        return {"created": True, "experiment": experiment}

    def _generate_schedule(self, duration_days: int) -> List[Dict[str, Any]]:
        """Generate a randomized A/B schedule with balanced blocks."""
        schedule = []
        # Use block randomization (blocks of 2 or 4 days) for balance
        block_size = 2
        arms = []
        for _ in range(0, duration_days, block_size):
            block = ["A", "B"]
            random.shuffle(block)
            arms.extend(block)

        for day in range(duration_days):
            schedule.append({
                "day": day + 1,
                "arm": arms[day] if day < len(arms) else random.choice(["A", "B"]),
                "adherence": "pending",
                "metric_values": {}
            })

        return schedule

    def start_experiment(self, experiment_id: str) -> Dict[str, Any]:
        """Activate a draft experiment."""
        exp = self._experiments.get(experiment_id)
        if not exp:
            return {"error": "Experiment not found"}
        if exp["status"] != "draft":
            return {"error": f"Cannot start experiment in '{exp['status']}' status"}

        exp["status"] = "active"
        exp["started_at"] = datetime.utcnow().isoformat()
        return {"status": "active", "experiment": exp}

    def pause_experiment(self, experiment_id: str) -> Dict[str, Any]:
        exp = self._experiments.get(experiment_id)
        if not exp:
            return {"error": "Experiment not found"}
        exp["status"] = "paused"
        return {"status": "paused"}

    def resume_experiment(self, experiment_id: str) -> Dict[str, Any]:
        exp = self._experiments.get(experiment_id)
        if not exp:
            return {"error": "Experiment not found"}
        exp["status"] = "active"
        return {"status": "active"}

    def log_adherence(
        self,
        experiment_id: str,
        day_number: int,
        adhered: bool,
        metric_values: Optional[Dict[str, float]] = None,
        notes: str = ""
    ) -> Dict[str, Any]:
        """Log daily compliance and metric measurements."""
        exp = self._experiments.get(experiment_id)
        if not exp:
            return {"error": "Experiment not found"}

        # Update schedule day
        for day in exp["schedule"]:
            if day["day"] == day_number:
                day["adherence"] = "adhered" if adhered else "missed"
                if metric_values:
                    day["metric_values"] = metric_values
                break

        # Add to adherence log
        exp["adherence_log"].append({
            "day": day_number,
            "adhered": adhered,
            "metric_values": metric_values or {},
            "notes": notes,
            "recorded_at": datetime.utcnow().isoformat()
        })

        # Check if experiment is complete
        total_logged = len(exp["adherence_log"])
        if total_logged >= exp["duration_days"]:
            return self.complete_experiment(experiment_id)

        return {
            "logged": True,
            "day": day_number,
            "progress": f"{total_logged}/{exp['duration_days']} days"
        }

    def complete_experiment(self, experiment_id: str) -> Dict[str, Any]:
        """Complete an experiment and compute results."""
        exp = self._experiments.get(experiment_id)
        if not exp:
            return {"error": "Experiment not found"}

        exp["status"] = "completed"
        exp["completed_at"] = datetime.utcnow().isoformat()

        # Compute results
        results = self._compute_results(exp)
        exp["results"] = results

        return {"status": "completed", "results": results}

    def _compute_results(self, experiment: Dict[str, Any]) -> Dict[str, Any]:
        """Analyze experiment data to estimate treatment effect."""
        arm_a_values = {}
        arm_b_values = {}

        for day in experiment["schedule"]:
            arm = day["arm"]
            metrics = day.get("metric_values", {})
            target = arm_a_values if arm == "A" else arm_b_values

            for metric, value in metrics.items():
                if metric not in target:
                    target[metric] = []
                target[metric].append(value)

        # Compute per-metric effect estimates
        metric_results = {}
        for metric in experiment["outcome_metrics"]:
            a_vals = arm_a_values.get(metric, [])
            b_vals = arm_b_values.get(metric, [])

            if a_vals and b_vals:
                a_mean = sum(a_vals) / len(a_vals)
                b_mean = sum(b_vals) / len(b_vals)
                effect = a_mean - b_mean
                metric_results[metric] = {
                    "arm_a_mean": round(a_mean, 2),
                    "arm_b_mean": round(b_mean, 2),
                    "effect_estimate": round(effect, 2),
                    "favors": "A" if effect > 0 else "B" if effect < 0 else "neither",
                    "samples_a": len(a_vals),
                    "samples_b": len(b_vals)
                }
            else:
                metric_results[metric] = {
                    "effect_estimate": None,
                    "reason": "Insufficient data for this metric"
                }

        # Adherence quality
        total_days = len(experiment["schedule"])
        adhered_days = sum(1 for d in experiment["schedule"] if d.get("adherence") == "adhered")
        adherence_rate = adhered_days / max(total_days, 1)

        # Confidence
        confidence = uncertainty_engine.assess_confidence(
            data_days=total_days,
            data_completeness=adherence_rate,
            has_experiment=True
        )

        return {
            "metric_results": metric_results,
            "adherence_rate": round(adherence_rate, 2),
            "total_days": total_days,
            "adhered_days": adhered_days,
            "confidence": confidence,
            "recommendation": self._generate_recommendation(
                experiment, metric_results, adherence_rate
            )
        }

    def _generate_recommendation(
        self,
        experiment: Dict[str, Any],
        metric_results: Dict[str, Any],
        adherence_rate: float
    ) -> str:
        """Generate a plain-language recommendation from results."""
        if adherence_rate < 0.5:
            return (
                f"Adherence was low ({adherence_rate:.0%}). Results may not be reliable. "
                "Consider re-running this experiment with better adherence tracking."
            )

        favors_a = sum(1 for m in metric_results.values()
                       if isinstance(m.get("favors"), str) and m["favors"] == "A")
        favors_b = sum(1 for m in metric_results.values()
                       if isinstance(m.get("favors"), str) and m["favors"] == "B")

        if favors_a > favors_b:
            winner = experiment["intervention_a"]
            label = "Intervention A"
        elif favors_b > favors_a:
            winner = experiment["intervention_b"]
            label = "Intervention B"
        else:
            return "Results are mixed. No clear winner between the two approaches."

        return (
            f"{label} (\"{winner}\") showed better outcomes across "
            f"{max(favors_a, favors_b)} of {len(metric_results)} metrics. "
            f"Adherence: {adherence_rate:.0%}."
        )

    def get_experiment(self, experiment_id: str) -> Optional[Dict[str, Any]]:
        return self._experiments.get(experiment_id)

    def list_experiments(self, user_id: str) -> List[Dict[str, Any]]:
        return [e for e in self._experiments.values() if e["user_id"] == user_id]

    async def get_experiment_summary(self, experiment_id: str) -> Optional[str]:
        """Use LLM to generate a human-friendly experiment summary."""
        exp = self.get_experiment(experiment_id)
        if not exp or not exp.get("results"):
            return None

        prompt = (
            f"You are St. Raphael, a compassionate health guardian. Summarize this personal "
            f"health experiment in 3-4 sentences.\n\n"
            f"Experiment: {exp['name']}\n"
            f"Intervention A: {exp['intervention_a']}\n"
            f"Intervention B: {exp['intervention_b']}\n"
            f"Duration: {exp['duration_days']} days\n"
            f"Results: {exp['results']}\n"
            f"Be warm, precise, and honest about confidence level."
        )

        try:
            return await self.llm.generate_response([{"role": "user", "content": prompt}])
        except Exception:
            return exp["results"].get("recommendation", "Experiment complete. Review results above.")


experiment_engine = ExperimentEngine()
