"""
Shared health prediction service for St. Raphael and St. Joseph.
"""
from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime, timedelta, timezone
from statistics import mean
from typing import Any, Dict, Iterable, List, Optional


def clamp_score(value: float, minimum: float = 0.0, maximum: float = 100.0) -> float:
    return max(minimum, min(maximum, float(value)))


def safe_float(value: Any, default: float = 0.0) -> float:
    try:
        return float(value)
    except (TypeError, ValueError):
        return default


def safe_int(value: Any, default: int = 0) -> int:
    try:
        return int(value)
    except (TypeError, ValueError):
        return default


def utcnow() -> datetime:
    return datetime.now(timezone.utc)


def parse_datetime(value: Any) -> Optional[datetime]:
    if not value:
        return None
    if isinstance(value, datetime):
        return value if value.tzinfo else value.replace(tzinfo=timezone.utc)
    if isinstance(value, str):
        try:
            normalized = value.replace("Z", "+00:00")
            parsed = datetime.fromisoformat(normalized)
            return parsed if parsed.tzinfo else parsed.replace(tzinfo=timezone.utc)
        except ValueError:
            return None
    return None


def iso_now() -> str:
    return utcnow().isoformat()


def risk_level(score: float) -> str:
    if score >= 80:
        return "critical"
    if score >= 60:
        return "high"
    if score >= 35:
        return "moderate"
    return "low"


def trend_label(delta: float) -> str:
    if delta >= 5:
        return "declining"
    if delta <= -5:
        return "improving"
    return "stable"


@dataclass
class LaneComputation:
    name: str
    score: float
    confidence: float
    measured_inputs: List[str]
    inferred_inputs: List[str]
    top_drivers: List[Dict[str, Any]]
    trend: str


class SharedHealthPredictor:
    CARDIAC_KEYWORDS = {"heart_disease", "hypertension", "arrhythmia", "heart"}
    METABOLIC_KEYWORDS = {"diabetes_type1", "diabetes_type2", "diabetes", "glucose", "thyroid", "weight"}
    SLEEP_KEYWORDS = {"sleep_apnea", "sleep", "insomnia"}
    STRESS_KEYWORDS = {"anxiety", "depression", "stress"}

    def _get_metric_values(self, metrics_history: List[Dict[str, Any]], metric_names: Iterable[str]) -> List[float]:
        names = {name.lower() for name in metric_names}
        values: List[float] = []
        for metric in metrics_history:
            metric_name = str(metric.get("metric_type") or metric.get("type") or "").lower()
            if metric_name in names:
                value = safe_float(metric.get("value"))
                if value:
                    values.append(value)
        return values

    def _get_recent_metric_points(self, metrics_history: List[Dict[str, Any]], metric_names: Iterable[str]) -> List[Dict[str, Any]]:
        names = {name.lower() for name in metric_names}
        points = [
            metric
            for metric in metrics_history
            if str(metric.get("metric_type") or metric.get("type") or "").lower() in names
        ]
        points.sort(
            key=lambda metric: parse_datetime(metric.get("timestamp") or metric.get("date") or metric.get("recorded_at"))
            or datetime.min.replace(tzinfo=timezone.utc)
        )
        return points

    def _average_metric(self, metrics_history: List[Dict[str, Any]], metric_names: Iterable[str]) -> Optional[float]:
        values = self._get_metric_values(metrics_history, metric_names)
        return mean(values) if values else None

    def _recent_delta(self, metrics_history: List[Dict[str, Any]], metric_names: Iterable[str]) -> float:
        points = self._get_recent_metric_points(metrics_history, metric_names)
        if len(points) < 2:
            return 0.0
        first = safe_float(points[max(0, len(points) - 5)].get("value"))
        last = safe_float(points[-1].get("value"))
        return last - first

    def _extract_conditions(self, profile: Optional[Dict[str, Any]], member: Optional[Dict[str, Any]] = None) -> List[str]:
        conditions: List[str] = []
        for source in (profile or {}, member or {}):
            raw = source.get("health_conditions") or source.get("conditions") or source.get("traits") or []
            if isinstance(raw, str):
                raw = [raw]
            for item in raw or []:
                normalized = str(item).strip().lower().replace(" ", "_")
                if normalized:
                    conditions.append(normalized)
        deduped: List[str] = []
        for condition in conditions:
            if condition not in deduped:
                deduped.append(condition)
        return deduped

    def _extract_ocean_scores(self, member: Optional[Dict[str, Any]], profile: Optional[Dict[str, Any]] = None) -> Dict[str, float]:
        sources = [
            (member or {}).get("ocean_scores"),
            (member or {}).get("scores"),
            (profile or {}).get("ocean_scores"),
            (profile or {}).get("scores"),
        ]
        for source in sources:
            if isinstance(source, dict) and source:
                return {
                    "openness": safe_float(source.get("openness") or source.get("O")),
                    "conscientiousness": safe_float(source.get("conscientiousness") or source.get("C")),
                    "extraversion": safe_float(source.get("extraversion") or source.get("E")),
                    "agreeableness": safe_float(source.get("agreeableness") or source.get("A")),
                    "neuroticism": safe_float(source.get("neuroticism") or source.get("N")),
                }
        return {
            "openness": 0.0,
            "conscientiousness": 0.0,
            "extraversion": 0.0,
            "agreeableness": 0.0,
            "neuroticism": 0.0,
        }

    def _compute_adherence_modifier(
        self,
        ocean_scores: Dict[str, float],
        medications: Optional[List[Dict[str, Any]]] = None,
        existing_actions: Optional[List[Dict[str, Any]]] = None,
    ) -> Dict[str, Any]:
        medication_count = len(medications or [])
        incomplete_actions = len(
            [
                action
                for action in (existing_actions or [])
                if str(action.get("status", "pending")).lower() not in {"done", "completed", "reviewed"}
            ]
        )
        conscientiousness = ocean_scores.get("conscientiousness", 50.0) or 50.0
        neuroticism = ocean_scores.get("neuroticism", 50.0) or 50.0
        agreeableness = ocean_scores.get("agreeableness", 50.0) or 50.0
        score = clamp_score(
            35
            + medication_count * 6
            + incomplete_actions * 5
            + (100 - conscientiousness) * 0.25
            + neuroticism * 0.20
            - agreeableness * 0.10
        )
        return {
            "score": score,
            "drivers": [
                {"factor": "Medication complexity", "weight": medication_count * 6, "source": "measured"},
                {"factor": "Outstanding actions", "weight": incomplete_actions * 5, "source": "measured"},
                {
                    "factor": "OCEAN adherence modifier",
                    "weight": round(((100 - conscientiousness) * 0.25) + neuroticism * 0.20, 1),
                    "source": "family-history-derived" if ocean_scores.get("conscientiousness") else "educated inference",
                },
            ],
        }

    def _lane_from_metrics(
        self,
        name: str,
        base_score: float,
        metric_score: float,
        measured_inputs: List[str],
        inferred_inputs: List[str],
        drivers: List[Dict[str, Any]],
        delta: float,
    ) -> LaneComputation:
        confidence = clamp_score(35 + len(measured_inputs) * 15 + len(inferred_inputs) * 5)
        score = clamp_score(base_score + metric_score)
        return LaneComputation(
            name=name,
            score=score,
            confidence=confidence,
            measured_inputs=measured_inputs,
            inferred_inputs=inferred_inputs,
            top_drivers=drivers[:3],
            trend=trend_label(delta),
        )

    def _build_condition_forecasts(
        self,
        metrics_history: List[Dict[str, Any]],
        profile: Optional[Dict[str, Any]],
        member_conditions: List[str],
        ocean_scores: Dict[str, float],
        medications: Optional[List[Dict[str, Any]]] = None,
        existing_actions: Optional[List[Dict[str, Any]]] = None,
        experiment_summary: Optional[List[Dict[str, Any]]] = None,
    ) -> List[Dict[str, Any]]:
        conditions = set(member_conditions)

        resting_hr = self._average_metric(metrics_history, ["heart_rate", "resting_hr"])
        blood_pressure = self._average_metric(metrics_history, ["blood_pressure", "blood_pressure_systolic"])
        glucose = self._average_metric(metrics_history, ["glucose", "glucose_variability", "a1c"])
        sleep = self._average_metric(metrics_history, ["sleep_duration", "sleep_quality"])
        stress = self._average_metric(metrics_history, ["stress_level", "mood"])

        adherence = self._compute_adherence_modifier(ocean_scores, medications, existing_actions)
        experiment_count = len(experiment_summary or [])

        cardiac = self._lane_from_metrics(
            "cardiac",
            15
            + (12 if conditions.intersection(self.CARDIAC_KEYWORDS) else 0)
            + (10 if blood_pressure and blood_pressure >= 135 else 0)
            + (8 if resting_hr and resting_hr >= 85 else 0),
            6 if experiment_count else 0,
            [label for label, present in {
                "blood pressure": blood_pressure is not None,
                "heart rate": resting_hr is not None,
            }.items() if present],
            ["family cardiac history"] if conditions.intersection(self.CARDIAC_KEYWORDS) else [],
            [
                {"factor": "Cardiac condition history", "weight": 12, "source": "family-history-derived"}
                if conditions.intersection(self.CARDIAC_KEYWORDS)
                else {"factor": "Measured cardiac inputs", "weight": 8, "source": "measured"},
                {"factor": "Elevated blood pressure", "weight": 10, "source": "measured"},
                {"factor": "Medication / experiment strain", "weight": experiment_count * 3, "source": "educated inference"},
            ],
            self._recent_delta(metrics_history, ["heart_rate", "blood_pressure", "blood_pressure_systolic"]),
        )

        metabolic = self._lane_from_metrics(
            "metabolic",
            15
            + (15 if conditions.intersection(self.METABOLIC_KEYWORDS) else 0)
            + (12 if glucose and glucose >= 125 else 0),
            0,
            [label for label, present in {"glucose": glucose is not None}.items() if present],
            ["family metabolic history"] if conditions.intersection(self.METABOLIC_KEYWORDS) else [],
            [
                {"factor": "Metabolic condition history", "weight": 15, "source": "family-history-derived"},
                {"factor": "Glucose trend", "weight": 12, "source": "measured"},
                {"factor": "Activity / nutrition consistency", "weight": 5, "source": "educated inference"},
            ],
            self._recent_delta(metrics_history, ["glucose", "glucose_variability", "a1c"]),
        )

        sleep_lane = self._lane_from_metrics(
            "sleep_recovery",
            12
            + (12 if conditions.intersection(self.SLEEP_KEYWORDS) else 0)
            + (10 if sleep and sleep < 6.5 else 0),
            0,
            [label for label, present in {"sleep duration": sleep is not None}.items() if present],
            ["sleep apnea history"] if conditions.intersection(self.SLEEP_KEYWORDS) else [],
            [
                {"factor": "Sleep deficit", "weight": 10, "source": "measured"},
                {"factor": "Sleep condition history", "weight": 12, "source": "family-history-derived"},
                {"factor": "Recovery workload", "weight": 4, "source": "educated inference"},
            ],
            self._recent_delta(metrics_history, ["sleep_duration", "sleep_quality"]),
        )

        stress_lane = self._lane_from_metrics(
            "stress_mental_load",
            12
            + (10 if conditions.intersection(self.STRESS_KEYWORDS) else 0)
            + (12 if stress and stress >= 7 else 0),
            0,
            [label for label, present in {"stress level": stress is not None}.items() if present],
            ["stress-history signals"] if conditions.intersection(self.STRESS_KEYWORDS) else [],
            [
                {"factor": "Stress signal", "weight": 12, "source": "measured"},
                {"factor": "Behavioral risk history", "weight": 10, "source": "family-history-derived"},
                {"factor": "Household load", "weight": 6, "source": "educated inference"},
            ],
            self._recent_delta(metrics_history, ["stress_level", "mood"]),
        )

        adherence_lane = self._lane_from_metrics(
            "adherence_risk",
            adherence["score"],
            0,
            ["medication plan"] if medications else [],
            ["OCEAN adherence fit"],
            adherence["drivers"],
            0,
        )

        forecasts = [cardiac, metabolic, sleep_lane, stress_lane, adherence_lane]
        return [
            {
                "lane": lane.name,
                "current_risk_level": risk_level(lane.score),
                "score": round(lane.score, 1),
                "trend_direction": lane.trend,
                "confidence": round(lane.confidence, 1),
                "top_drivers": lane.top_drivers,
                "measured_inputs_used": lane.measured_inputs,
                "inferred_inputs_used": lane.inferred_inputs,
            }
            for lane in forecasts
        ]

    def _build_horizon_forecasts(self, condition_forecasts: List[Dict[str, Any]]) -> Dict[str, Any]:
        if not condition_forecasts:
            return {}
        base_score = mean(item["score"] for item in condition_forecasts)
        horizons = {}
        for label, modifier in {"30d": 0, "90d": 5, "1y": 10}.items():
            projected = clamp_score(base_score + modifier)
            horizons[label] = {
                "score": round(projected, 1),
                "risk_level": risk_level(projected),
                "trend": trend_label(modifier),
            }
        return horizons

    def _build_forecast_deltas(
        self,
        metrics_history: List[Dict[str, Any]],
        medications: Optional[List[Dict[str, Any]]] = None,
        experiment_summary: Optional[List[Dict[str, Any]]] = None,
    ) -> List[Dict[str, Any]]:
        deltas: List[Dict[str, Any]] = []
        for label, metric_names in {
            "Heart rate trend": ["heart_rate", "resting_hr"],
            "Glucose trend": ["glucose", "glucose_variability", "a1c"],
            "Sleep trend": ["sleep_duration", "sleep_quality"],
            "Stress trend": ["stress_level", "mood"],
        }.items():
            delta = self._recent_delta(metrics_history, metric_names)
            if delta:
                deltas.append(
                    {
                        "label": label,
                        "delta": round(delta, 2),
                        "direction": trend_label(delta),
                        "source": "measured",
                    }
                )
        if medications:
            deltas.append(
                {
                    "label": "Medication burden",
                    "delta": len(medications),
                    "direction": "stable",
                    "source": "measured",
                }
            )
        if experiment_summary:
            deltas.append(
                {
                    "label": "Active experiments",
                    "delta": len(experiment_summary),
                    "direction": "stable",
                    "source": "measured",
                }
            )
        return deltas

    def _build_source_breakdown(
        self,
        family_members: List[Dict[str, Any]],
        metrics_history: List[Dict[str, Any]],
        profile: Optional[Dict[str, Any]],
        medications: Optional[List[Dict[str, Any]]],
        experiment_summary: Optional[List[Dict[str, Any]]],
        trinity_context: Optional[Dict[str, Any]],
        emergency_contacts: Optional[List[Dict[str, Any]]],
    ) -> Dict[str, Any]:
        profiled_members = sum(1 for member in family_members if any(self._extract_ocean_scores(member).values()))
        conditions = self._extract_conditions(profile)
        return {
            "measured": {
                "recent_health_metrics": len(metrics_history),
                "metric_types": sorted({str(metric.get("metric_type") or metric.get("type") or "").lower() for metric in metrics_history if metric.get("metric_type") or metric.get("type")}),
                "medications": len(medications or []),
                "experiments": len(experiment_summary or []),
                "emergency_contacts": len(emergency_contacts or []),
            },
            "family_history": {
                "family_members": len(family_members),
                "ocean_profiles": profiled_members,
                "declared_conditions": conditions,
            },
            "educated_inference": {
                "trinity_inputs": sorted((trinity_context or {}).keys()),
                "missing_sections": [
                    label
                    for label, available in {
                        "metrics": bool(metrics_history),
                        "ocean": profiled_members > 0,
                        "health_profile": bool(profile),
                        "trinity": bool(trinity_context),
                    }.items()
                    if not available
                ],
            },
        }

    def _member_role_from_relationships(self, member_id: str, relationships: Optional[List[Dict[str, Any]]]) -> str:
        if not relationships:
            return "supporter"
        relation_types = {
            str(rel.get("type", "")).lower()
            for rel in relationships
            if rel.get("fromId") == member_id or rel.get("toId") == member_id or rel.get("from_id") == member_id or rel.get("to_id") == member_id
        }
        if "parent" in relation_types:
            return "care coordinator"
        if "spouse" in relation_types:
            return "primary support"
        if "child" in relation_types:
            return "dependent support"
        return "supporter"

    def _build_coordination_summary(
        self,
        family_members: List[Dict[str, Any]],
        relationships: Optional[List[Dict[str, Any]]],
        condition_forecasts: List[Dict[str, Any]],
        emergency_contacts: Optional[List[Dict[str, Any]]],
        trinity_context: Optional[Dict[str, Any]],
    ) -> Dict[str, Any]:
        at_risk_members = [member for member in family_members if safe_float(member.get("risk_score"), 0) >= 60]
        senior_count = 0
        current_year = utcnow().year
        for member in family_members:
            birth_year = safe_int(member.get("birthYear") or member.get("birth_year"), 0)
            if birth_year and current_year - birth_year >= 65:
                senior_count += 1
        caregiver_load = clamp_score(len(at_risk_members) * 18 + senior_count * 12 + len(condition_forecasts) * 2)
        emergency_readiness = clamp_score((len(emergency_contacts or []) * 25) - senior_count * 3)
        contact_coverage = clamp_score((len(emergency_contacts or []) / max(len(family_members), 1)) * 100)
        coordination_priority = "high" if caregiver_load >= 60 or bool((trinity_context or {}).get("alerts")) else "moderate" if caregiver_load >= 35 else "low"
        likely_care_coordinators = [
            {
                "member_id": member.get("id"),
                "member_name": f"{member.get('firstName', '')} {member.get('lastName', '')}".strip() or str(member.get("name", "Family Member")),
                "recommended_role": self._member_role_from_relationships(str(member.get("id")), relationships),
            }
            for member in family_members[:4]
        ]
        support_gaps = []
        if not emergency_contacts:
            support_gaps.append("No emergency contacts are configured.")
        if senior_count and caregiver_load >= 60:
            support_gaps.append("Caregiver load is elevated for older family members.")
        if not likely_care_coordinators:
            support_gaps.append("No likely care coordinators could be identified from genealogy data.")
        return {
            "caregiver_load_score": round(caregiver_load, 1),
            "emergency_readiness_score": round(emergency_readiness, 1),
            "contact_coverage_score": round(contact_coverage, 1),
            "coordination_priority": coordination_priority,
            "likely_care_coordinators": likely_care_coordinators,
            "support_gaps": support_gaps,
            "at_risk_family_members": len(at_risk_members),
            "senior_family_members": senior_count,
        }

    def _support_tone_guidance(self, ocean_scores: Dict[str, float]) -> str:
        if ocean_scores.get("agreeableness", 0) >= 65:
            return "gentle, collaborative prompts"
        if ocean_scores.get("conscientiousness", 0) >= 65:
            return "clear routines and structured check-ins"
        if ocean_scores.get("neuroticism", 0) >= 60:
            return "calm, low-pressure reassurance"
        return "direct, practical support"

    def _build_support_cards(
        self,
        family_members: List[Dict[str, Any]],
        relationships: Optional[List[Dict[str, Any]]],
        coordination_summary: Dict[str, Any],
    ) -> List[Dict[str, Any]]:
        cards: List[Dict[str, Any]] = []
        for member in family_members:
            ocean_scores = self._extract_ocean_scores(member)
            friction_points: List[str] = []
            if ocean_scores.get("neuroticism", 0) >= 60:
                friction_points.append("higher stress sensitivity")
            if ocean_scores.get("conscientiousness", 0) <= 45:
                friction_points.append("follow-through may need reminders")
            if not friction_points:
                friction_points.append("no major behavioral friction detected")

            urgency = "high" if safe_float(member.get("risk_score"), 0) >= 70 else "moderate" if safe_float(member.get("risk_score"), 0) >= 40 else "low"
            cards.append(
                {
                    "member_id": member.get("id"),
                    "member_name": f"{member.get('firstName', '')} {member.get('lastName', '')}".strip() or str(member.get("name", "Family Member")),
                    "support_tone_guidance": self._support_tone_guidance(ocean_scores),
                    "likely_friction_points": friction_points,
                    "recommended_family_role": self._member_role_from_relationships(str(member.get("id")), relationships),
                    "coordination_urgency": urgency,
                }
            )
        return cards

    def _build_recommended_actions(
        self,
        condition_forecasts: List[Dict[str, Any]],
        coordination_summary: Dict[str, Any],
        support_cards: List[Dict[str, Any]],
    ) -> List[Dict[str, Any]]:
        actions: List[Dict[str, Any]] = []
        high_lanes = [lane for lane in condition_forecasts if lane["current_risk_level"] in {"high", "critical"}]
        now = utcnow()

        for lane in high_lanes[:3]:
            actions.append(
                {
                    "id": f"action-{lane['lane']}",
                    "title": f"Review {lane['lane'].replace('_', ' ')} risk",
                    "description": f"Measured and family-history signals show {lane['current_risk_level']} {lane['lane']} pressure.",
                    "priority": "high",
                    "owner_member_id": support_cards[0]["member_id"] if support_cards else None,
                    "linked_forecast_lane": lane["lane"],
                    "destination": "task",
                    "due_at": (now + timedelta(days=3)).isoformat(),
                    "status": "draft",
                }
            )

        if coordination_summary.get("support_gaps"):
            actions.append(
                {
                    "id": "action-emergency-contacts",
                    "title": "Update emergency readiness",
                    "description": coordination_summary["support_gaps"][0],
                    "priority": "high",
                    "owner_member_id": support_cards[0]["member_id"] if support_cards else None,
                    "linked_forecast_lane": "family_coordination",
                    "destination": "calendar",
                    "due_at": (now + timedelta(days=5)).isoformat(),
                    "status": "draft",
                }
            )
        return actions

    async def detect_early_warnings(
        self,
        user_id: str,
        metrics_history: List[Dict[str, Any]],
    ) -> List[Dict[str, Any]]:
        warnings: List[Dict[str, Any]] = []

        resting_hr = self._average_metric(metrics_history, ["heart_rate", "resting_hr"])
        glucose = self._average_metric(metrics_history, ["glucose", "glucose_variability", "a1c"])
        sleep = self._average_metric(metrics_history, ["sleep_duration", "sleep_quality"])
        stress = self._average_metric(metrics_history, ["stress_level", "mood"])

        if resting_hr is not None and resting_hr >= 95:
            warnings.append(
                {
                    "warning_id": f"{user_id}-heart-rate",
                    "metric": "heart_rate",
                    "severity": "high",
                    "message": "Resting heart rate is elevated above the preferred recovery range.",
                    "recommended_action": "Review hydration, sleep debt, and near-term exertion before adding more load.",
                    "confidence": 82,
                }
            )

        if glucose is not None and glucose >= 140:
            warnings.append(
                {
                    "warning_id": f"{user_id}-glucose",
                    "metric": "glucose",
                    "severity": "high",
                    "message": "Glucose is trending above the stable daily target range.",
                    "recommended_action": "Review nutrition, medication adherence, and follow-up measurements with Raphael.",
                    "confidence": 78,
                }
            )

        if sleep is not None and sleep < 6:
            warnings.append(
                {
                    "warning_id": f"{user_id}-sleep",
                    "metric": "sleep_duration",
                    "severity": "moderate",
                    "message": "Sleep recovery is below the minimum threshold Raphael expects.",
                    "recommended_action": "Protect the next recovery window and avoid stacking additional stressors.",
                    "confidence": 74,
                }
            )

        if stress is not None and stress >= 7:
            warnings.append(
                {
                    "warning_id": f"{user_id}-stress",
                    "metric": "stress_level",
                    "severity": "moderate",
                    "message": "Stress signals are elevated and may compound other risk lanes.",
                    "recommended_action": "Reduce avoidable load and add one concrete recovery action today.",
                    "confidence": 69,
                }
            )

        return warnings

    def _build_member_prediction(
        self,
        member: Dict[str, Any],
        metrics_history: List[Dict[str, Any]],
        profile: Optional[Dict[str, Any]],
        medications: Optional[List[Dict[str, Any]]],
        experiment_summary: Optional[List[Dict[str, Any]]],
        existing_actions: Optional[List[Dict[str, Any]]],
    ) -> Dict[str, Any]:
        ocean_scores = self._extract_ocean_scores(member, profile)
        conditions = self._extract_conditions(profile, member)
        condition_forecasts = self._build_condition_forecasts(
            metrics_history,
            profile,
            conditions,
            ocean_scores,
            medications,
            existing_actions,
            experiment_summary,
        )
        aggregate_score = clamp_score(mean(item["score"] for item in condition_forecasts)) if condition_forecasts else 0.0
        factors: List[Dict[str, Any]] = []
        for lane in condition_forecasts:
            for driver in lane["top_drivers"]:
                factor_name = str(driver.get("factor", "")).strip()
                if not factor_name:
                    continue
                factors.append(
                    {
                        "factor": factor_name,
                        "weight": safe_float(driver.get("weight"), 0),
                        "source": str(driver.get("source", "educated inference")),
                    }
                )
        factors.sort(key=lambda factor: factor["weight"], reverse=True)
        unique_factors: List[Dict[str, Any]] = []
        seen: set[str] = set()
        for factor in factors:
            if factor["factor"] in seen:
                continue
            seen.add(factor["factor"])
            unique_factors.append(factor)

        prediction = {
            "predicted_value": round(aggregate_score, 1),
            "risk_level": risk_level(aggregate_score),
            "trend": trend_label(sum(self._recent_delta(metrics_history, names) for names in [["heart_rate"], ["glucose"], ["sleep_duration"], ["stress_level"]])),
            "risk_factors": unique_factors[:5],
            "uncertainty": {
                "confidence_score": round(mean(item["confidence"] for item in condition_forecasts), 1) if condition_forecasts else 0,
                "confidence_level": "high" if condition_forecasts and mean(item["confidence"] for item in condition_forecasts) >= 75 else "medium" if condition_forecasts else "low",
            },
            "source_breakdown": {
                "measured_inputs": sum(len(item["measured_inputs_used"]) for item in condition_forecasts),
                "family_history_inputs": sum(len(item["inferred_inputs_used"]) for item in condition_forecasts),
            },
        }
        return {
            "member_id": member.get("id"),
            "member_name": f"{member.get('firstName', '')} {member.get('lastName', '')}".strip() or str(member.get("name", "Family Member")),
            "consent_granted": True,
            "prediction": prediction,
            "condition_forecasts": condition_forecasts,
            "risk_score": aggregate_score,
            "ocean_scores": ocean_scores,
        }

    async def predict_user(
        self,
        user_id: str,
        metrics_history: List[Dict[str, Any]],
        profile: Optional[Dict[str, Any]] = None,
    ) -> Dict[str, Any]:
        ocean_scores = self._extract_ocean_scores({}, profile)
        forecasts = self._build_condition_forecasts(metrics_history, profile, self._extract_conditions(profile), ocean_scores)
        aggregate_score = clamp_score(mean(item["score"] for item in forecasts)) if forecasts else 0.0
        forecast_deltas = self._build_forecast_deltas(metrics_history)
        primary = forecasts[0] if forecasts else {
            "lane": "baseline",
            "current_risk_level": "low",
            "score": 0,
            "trend_direction": "stable",
            "confidence": 0,
            "top_drivers": [],
            "measured_inputs_used": [],
            "inferred_inputs_used": [],
        }
        return {
            "user_id": user_id,
            "predicted_value": round(aggregate_score, 1),
            "risk_level": risk_level(aggregate_score),
            "trend": primary["trend_direction"],
            "risk_factors": [
                {
                    "factor": driver["factor"],
                    "weight": safe_float(driver.get("weight"), 0),
                    "source": str(driver.get("source", "educated inference")),
                }
                for driver in primary["top_drivers"]
            ],
            "condition_forecasts": forecasts,
            "forecast_deltas": forecast_deltas,
            "horizons": self._build_horizon_forecasts(forecasts),
            "uncertainty": {
                "confidence_score": round(mean(item["confidence"] for item in forecasts), 1) if forecasts else 0,
                "confidence_level": "high" if forecasts and mean(item["confidence"] for item in forecasts) >= 75 else "medium" if forecasts else "low",
            },
            "generated_at": iso_now(),
        }

    async def predict_family(
        self,
        user_id: str,
        family_members: List[Dict[str, Any]],
        consent_map: Optional[Dict[str, bool]] = None,
        relationships: Optional[List[Dict[str, Any]]] = None,
        metrics_history: Optional[List[Dict[str, Any]]] = None,
        profile: Optional[Dict[str, Any]] = None,
        medications: Optional[List[Dict[str, Any]]] = None,
        experiment_summary: Optional[List[Dict[str, Any]]] = None,
        trinity_context: Optional[Dict[str, Any]] = None,
        emergency_contacts: Optional[List[Dict[str, Any]]] = None,
        existing_actions: Optional[List[Dict[str, Any]]] = None,
    ) -> Dict[str, Any]:
        metrics_history = metrics_history or []
        family_members = family_members or []
        consent_map = consent_map or {}

        member_predictions: List[Dict[str, Any]] = []
        for member in family_members:
            if consent_map and not consent_map.get(str(member.get("id")), False):
                member_predictions.append(
                    {
                        "member_id": member.get("id"),
                        "member_name": f"{member.get('firstName', '')} {member.get('lastName', '')}".strip() or str(member.get("name", "Family Member")),
                        "consent_granted": False,
                        "prediction": None,
                        "early_warnings": [],
                    }
                )
                continue
            member_prediction = self._build_member_prediction(
                member,
                metrics_history,
                profile,
                medications,
                experiment_summary,
                existing_actions,
            )
            member_prediction["early_warnings"] = await self.detect_early_warnings(user_id, metrics_history)
            member_predictions.append(member_prediction)

        active_predictions = [entry for entry in member_predictions if entry.get("prediction")]
        condition_forecasts = []
        if active_predictions:
            aggregated_by_lane: Dict[str, List[Dict[str, Any]]] = {}
            for entry in active_predictions:
                for lane in entry.get("condition_forecasts", []):
                    aggregated_by_lane.setdefault(lane["lane"], []).append(lane)
            for lane_name, lane_entries in aggregated_by_lane.items():
                condition_forecasts.append(
                    {
                        "lane": lane_name,
                        "current_risk_level": risk_level(mean(entry["score"] for entry in lane_entries)),
                        "score": round(mean(entry["score"] for entry in lane_entries), 1),
                        "trend_direction": max((entry["trend_direction"] for entry in lane_entries), default="stable"),
                        "confidence": round(mean(entry["confidence"] for entry in lane_entries), 1),
                        "top_drivers": lane_entries[0]["top_drivers"][:3],
                        "measured_inputs_used": sorted({item for entry in lane_entries for item in entry["measured_inputs_used"]}),
                        "inferred_inputs_used": sorted({item for entry in lane_entries for item in entry["inferred_inputs_used"]}),
                    }
                )

        aggregate_score = clamp_score(mean(entry.get("risk_score", 0) for entry in active_predictions)) if active_predictions else 0.0
        source_breakdown = self._build_source_breakdown(
            family_members,
            metrics_history,
            profile,
            medications,
            experiment_summary,
            trinity_context,
            emergency_contacts,
        )
        for entry in active_predictions:
            entry["risk_score"] = round(entry.get("risk_score", 0), 1)
        coordination_summary = self._build_coordination_summary(
            active_predictions if active_predictions else family_members,
            relationships,
            condition_forecasts,
            emergency_contacts,
            trinity_context,
        )
        support_cards = self._build_support_cards(
            active_predictions if active_predictions else family_members,
            relationships,
            coordination_summary,
        )
        recommended_actions = self._build_recommended_actions(condition_forecasts, coordination_summary, support_cards)

        shared_factors: List[Dict[str, Any]] = []
        seen_factors: set[str] = set()
        for entry in active_predictions:
            for factor in entry["prediction"]["risk_factors"]:
                if factor["factor"] in seen_factors:
                    continue
                seen_factors.add(factor["factor"])
                shared_factors.append(factor)

        primary_prediction = active_predictions[0]["prediction"] if active_predictions else {
            "predicted_value": 0,
            "risk_level": "low",
            "trend": "stable",
            "risk_factors": [],
            "uncertainty": {"confidence_score": 0, "confidence_level": "low"},
        }
        return {
            "family_id": user_id,
            "aggregate_risk": risk_level(aggregate_score),
            "aggregate_score": round(aggregate_score, 1),
            "member_predictions": [
                {
                    "member_id": entry.get("member_id"),
                    "member_name": entry.get("member_name"),
                    "consent_granted": entry.get("consent_granted", True),
                    "prediction": entry.get("prediction"),
                    "early_warnings": entry.get("early_warnings", []),
                }
                for entry in member_predictions
            ],
            "shared_risk_factors": shared_factors[:6],
            "horizons": self._build_horizon_forecasts(condition_forecasts),
            "condition_forecasts": condition_forecasts,
            "forecast_deltas": self._build_forecast_deltas(metrics_history, medications, experiment_summary),
            "source_breakdown": source_breakdown,
            "coordination_summary": coordination_summary,
            "support_cards": support_cards,
            "recommended_actions": recommended_actions,
            "primary_prediction": primary_prediction,
            "uncertainty": {
                "confidence_score": round(mean(item["confidence"] for item in condition_forecasts), 1) if condition_forecasts else 0,
                "confidence_level": "high" if condition_forecasts and mean(item["confidence"] for item in condition_forecasts) >= 75 else "medium" if condition_forecasts else "low",
            },
            "generated_at": iso_now(),
        }


shared_predictor = SharedHealthPredictor()
