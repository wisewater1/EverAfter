"""
N-of-1 Experiment Engine for Health Causal Twin.
Creates, manages, and analyzes personalized A/B lifestyle experiments.
"""
import random
import uuid
from typing import Dict, Any, List, Optional
from datetime import datetime, timedelta
from sqlalchemy import select, update, insert
from sqlalchemy.exc import ProgrammingError
from app.db.session import get_session_factory
from app.models.causal_twin import Experiment, ExperimentStatus
from app.services.causal_twin.safety_guardrails import safety_guardrails
from app.services.causal_twin.uncertainty_engine import uncertainty_engine
from app.ai.llm_client import get_llm_client

class ExperimentEngine:
    """Manages the full lifecycle of N-of-1 micro-randomized experiments."""

    def __init__(self):
        self.llm = get_llm_client()
        self._fallback_experiments: Dict[str, Dict[str, Any]] = {}

    @staticmethod
    def _missing_experiment_table(exc: Exception) -> bool:
        detail = str(exc).lower()
        return "causal_experiments" in detail and "does not exist" in detail

    def _fallback_create_experiment(
        self,
        user_id: str,
        name: str,
        intervention_a: str,
        intervention_b: str,
        outcome_metrics: List[str],
        duration_days: int,
        description: str,
        schedule: List[Dict[str, Any]],
    ) -> Dict[str, Any]:
        experiment_id = str(uuid.uuid4())
        experiment = {
            "id": experiment_id,
            "user_id": user_id,
            "name": name,
            "description": description,
            "intervention_a": intervention_a,
            "intervention_b": intervention_b,
            "outcome_metrics": list(outcome_metrics),
            "duration_days": duration_days,
            "status": ExperimentStatus.DRAFT.value,
            "schedule": schedule,
            "adherence_log": [],
            "results": None,
            "safety_approved": True,
            "created_at": datetime.utcnow().isoformat(),
            "started_at": None,
            "completed_at": None,
        }
        self._fallback_experiments[experiment_id] = experiment
        return experiment

    def _fallback_get_experiment(self, experiment_id: str) -> Optional[Dict[str, Any]]:
        experiment = self._fallback_experiments.get(experiment_id)
        return dict(experiment) if experiment else None

    async def create_experiment(
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

        experiment_data = {
            "user_id": user_id,
            "name": name,
            "description": description,
            "intervention_a": intervention_a,
            "intervention_b": intervention_b,
            "outcome_metrics": outcome_metrics,
            "duration_days": duration_days,
            "status": ExperimentStatus.DRAFT.value,
            "schedule": schedule,
            "adherence_log": [],
            "safety_approved": True,
            "created_at": datetime.utcnow()
        }

        async_session = get_session_factory()
        try:
            async with async_session() as session:
                new_exp = Experiment(**experiment_data)
                session.add(new_exp)
                await session.commit()
                await session.refresh(new_exp)
                
                # Convert to dict for return (id is now a UUID object)
                result_dict = {c.name: getattr(new_exp, c.name) for c in new_exp.__table__.columns}
                result_dict["id"] = str(new_exp.id)
                return {"created": True, "experiment": result_dict}
        except ProgrammingError as exc:
            if self._missing_experiment_table(exc):
                fallback = self._fallback_create_experiment(
                    user_id=user_id,
                    name=name,
                    intervention_a=intervention_a,
                    intervention_b=intervention_b,
                    outcome_metrics=outcome_metrics,
                    duration_days=duration_days,
                    description=description,
                    schedule=schedule,
                )
                return {"created": True, "experiment": fallback}
            raise
        
        return {"created": False, "error": "Database session context escaped"}
        
        return {"created": False, "error": "Database session failed"}

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

    async def start_experiment(self, experiment_id: str) -> Dict[str, Any]:
        """Activate a draft experiment."""
        async_session = get_session_factory()
        try:
            async with async_session() as session:
                result = await session.execute(select(Experiment).where(Experiment.id == experiment_id))
                exp = result.scalar_one_or_none()
                
                if not exp:
                    return {"error": "Experiment not found"}
                if exp.status != ExperimentStatus.DRAFT.value:
                    return {"error": f"Cannot start experiment in '{exp.status}' status"}

                exp.status = ExperimentStatus.ACTIVE.value
                exp.started_at = datetime.utcnow()
                await session.commit()
                return {"status": "active"}
        except ProgrammingError as exc:
            if self._missing_experiment_table(exc):
                exp = self._fallback_experiments.get(experiment_id)
                if not exp:
                    return {"error": "Experiment not found"}
                if exp["status"] != ExperimentStatus.DRAFT.value:
                    return {"error": f"Cannot start experiment in '{exp['status']}' status"}
                exp["status"] = ExperimentStatus.ACTIVE.value
                exp["started_at"] = datetime.utcnow().isoformat()
                return {"status": "active"}
            raise
        
        return {"error": "Database session context escaped"}
        
        return {"error": "Failed to start experiment"}

    async def pause_experiment(self, experiment_id: str) -> Dict[str, Any]:
        async_session = get_session_factory()
        try:
            async with async_session() as session:
                await session.execute(
                    update(Experiment)
                    .where(Experiment.id == experiment_id)
                    .values(status=ExperimentStatus.PAUSED.value)
                )
                await session.commit()
                return {"status": "paused"}
        except ProgrammingError as exc:
            if self._missing_experiment_table(exc):
                exp = self._fallback_experiments.get(experiment_id)
                if not exp:
                    return {"error": "Experiment not found"}
                exp["status"] = ExperimentStatus.PAUSED.value
                return {"status": "paused"}
            raise
        
        return {"error": "Database session context escaped"}
        
        return {"error": "Failed to pause experiment"}

    async def resume_experiment(self, experiment_id: str) -> Dict[str, Any]:
        async_session = get_session_factory()
        try:
            async with async_session() as session:
                await session.execute(
                    update(Experiment)
                    .where(Experiment.id == experiment_id)
                    .values(status=ExperimentStatus.ACTIVE.value)
                )
                await session.commit()
                return {"status": "active"}
        except ProgrammingError as exc:
            if self._missing_experiment_table(exc):
                exp = self._fallback_experiments.get(experiment_id)
                if not exp:
                    return {"error": "Experiment not found"}
                exp["status"] = ExperimentStatus.ACTIVE.value
                return {"status": "active"}
            raise

    async def log_adherence(
        self,
        experiment_id: str,
        day_number: int,
        adhered: bool,
        metric_values: Optional[Dict[str, float]] = None,
        notes: str = ""
    ) -> Dict[str, Any]:
        """Log daily compliance and metric measurements."""
        async_session = get_session_factory()
        try:
            async with async_session() as session:
                result = await session.execute(select(Experiment).where(Experiment.id == experiment_id))
                exp = result.scalar_one_or_none()
                if not exp:
                    return {"error": "Experiment not found"}

                # Update schedule day
                schedule = list(exp.schedule) if exp.schedule else []
                for day in schedule:
                    if day["day"] == day_number:
                        day["adherence"] = "adhered" if adhered else "missed"
                        if metric_values:
                            day["metric_values"] = metric_values
                        break
                
                exp.schedule = schedule

                # Add to adherence log
                log = list(exp.adherence_log) if exp.adherence_log else []
                log.append({
                    "day": day_number,
                    "adhered": adhered,
                    "metric_values": metric_values or {},
                    "notes": notes,
                    "recorded_at": datetime.utcnow().isoformat()
                })
                exp.adherence_log = log
                
                await session.commit()

                # Check if experiment is complete
                total_logged = len(log)
                if total_logged >= exp.duration_days:
                    return await self.complete_experiment(experiment_id)

                return {
                    "logged": True,
                    "day": day_number,
                    "progress": f"{total_logged}/{exp.duration_days} days"
                }
        except ProgrammingError as exc:
            if self._missing_experiment_table(exc):
                exp = self._fallback_experiments.get(experiment_id)
                if not exp:
                    return {"error": "Experiment not found"}
                schedule = list(exp.get("schedule") or [])
                for day in schedule:
                    if day["day"] == day_number:
                        day["adherence"] = "adhered" if adhered else "missed"
                        if metric_values:
                            day["metric_values"] = metric_values
                        break
                exp["schedule"] = schedule
                log = list(exp.get("adherence_log") or [])
                log.append({
                    "day": day_number,
                    "adhered": adhered,
                    "metric_values": metric_values or {},
                    "notes": notes,
                    "recorded_at": datetime.utcnow().isoformat()
                })
                exp["adherence_log"] = log
                total_logged = len(log)
                if total_logged >= exp["duration_days"]:
                    return await self.complete_experiment(experiment_id)
                return {
                    "logged": True,
                    "day": day_number,
                    "progress": f"{total_logged}/{exp['duration_days']} days"
                }
            raise
        
        return {"error": "Database session context escaped"}

    async def complete_experiment(self, experiment_id: str) -> Dict[str, Any]:
        """Complete an experiment and compute results."""
        async_session = get_session_factory()
        try:
            async with async_session() as session:
                result = await session.execute(select(Experiment).where(Experiment.id == experiment_id))
                exp = result.scalar_one_or_none()
                if not exp:
                    return {"error": "Experiment not found"}

                exp.status = ExperimentStatus.COMPLETED.value
                exp.completed_at = datetime.utcnow()

                # Compute results
                # Convert model to dict for result computation
                exp_dict = {c.name: getattr(exp, c.name) for c in exp.__table__.columns}
                results = self._compute_results(exp_dict)
                exp.results = results
                
                await session.commit()
                return {"status": "completed", "results": results}
        except ProgrammingError as exc:
            if self._missing_experiment_table(exc):
                exp = self._fallback_experiments.get(experiment_id)
                if not exp:
                    return {"error": "Experiment not found"}
                exp["status"] = ExperimentStatus.COMPLETED.value
                exp["completed_at"] = datetime.utcnow().isoformat()
                results = self._compute_results(exp)
                exp["results"] = results
                return {"status": "completed", "results": results}
            raise
        
        return {"error": "Failed to complete experiment"}

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
                    "arm_a_mean": round(float(a_mean), 2),
                    "arm_b_mean": round(float(b_mean), 2),
                    "effect_estimate": round(float(effect), 2),
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
            f"Adherence: {float(adherence_rate):.0%}."
        )

    async def get_experiment(self, experiment_id: str) -> Optional[Dict[str, Any]]:
        async_session = get_session_factory()
        try:
            async with async_session() as session:
                result = await session.execute(select(Experiment).where(Experiment.id == experiment_id))
                exp = result.scalar_one_or_none()
                if not exp:
                    return None
                result_dict = {c.name: getattr(exp, c.name) for c in exp.__table__.columns}
                result_dict["id"] = str(exp.id)
                return result_dict
        except ProgrammingError as exc:
            if self._missing_experiment_table(exc):
                return self._fallback_get_experiment(experiment_id)
            raise

    async def list_experiments(self, user_id: str) -> List[Dict[str, Any]]:
        async_session = get_session_factory()
        try:
            async with async_session() as session:
                result = await session.execute(select(Experiment).where(Experiment.user_id == user_id))
                experiments = result.scalars().all()
                return [{c.name: getattr(e, c.name) for c in e.__table__.columns} for e in experiments]
        except ProgrammingError as exc:
            if self._missing_experiment_table(exc):
                return [
                    dict(experiment)
                    for experiment in self._fallback_experiments.values()
                    if experiment.get("user_id") == user_id
                ]
            raise
        
        return []

    async def get_experiment_summary(self, experiment_id: str) -> Optional[str]:
        """Use LLM to generate a human-friendly experiment summary."""
        exp = await self.get_experiment(experiment_id)
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
