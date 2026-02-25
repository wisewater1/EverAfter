"""
Safety Guardrails for Health Causal Twin.
Blocks risky interventions, enforces non-diagnostic framing,
and triggers escalation prompts for concerning trends.
"""
from typing import Dict, Any, List, Optional


# Interventions that are NEVER allowed in experiments
BLOCKED_INTERVENTION_KEYWORDS = [
    "medication", "drug", "prescription", "supplement", "fasting",
    "caloric restriction", "skip meals", "insulin", "steroid",
    "blood thinner", "diuretic", "laxative", "stimulant",
    "hormone", "testosterone", "estrogen"
]

# Metrics that trigger escalation if out of range
CLINICAL_CONCERN_THRESHOLDS = {
    "resting_hr":      {"low": 40, "high": 120, "unit": "bpm"},
    "blood_pressure":  {"low": 80, "high": 180, "unit": "mmHg systolic"},
    "glucose":         {"low": 54, "high": 250, "unit": "mg/dL"},
    "oxygen_sat":      {"low": 90, "high": 100, "unit": "%"},
    "hrv":             {"low": 10, "high": None, "unit": "ms"},
}

WELLNESS_DISCLAIMER = (
    "This is a wellness insight based on your personal data patterns. "
    "It is not a medical diagnosis, treatment recommendation, or substitute "
    "for professional medical advice."
)

ESCALATION_MESSAGE = (
    "St. Raphael has noticed a pattern that may benefit from professional review. "
    "Consider consulting your healthcare provider about this trend."
)

EXPERIMENT_DISCLAIMER = (
    "This experiment reflects your personal response only. "
    "Results may not generalize beyond these specific conditions."
)


class SafetyGuardrails:
    """Validates interventions, frames responses, and detects escalation needs."""

    def validate_intervention(self, intervention_text: str) -> Dict[str, Any]:
        """Check if a proposed intervention is safe for experimentation."""
        text_lower = intervention_text.lower()
        blocked = []
        for keyword in BLOCKED_INTERVENTION_KEYWORDS:
            if keyword in text_lower:
                blocked.append(keyword)

        if blocked:
            return {
                "approved": False,
                "reason": f"Intervention involves restricted terms: {', '.join(blocked)}. "
                          "Experiments involving medications, supplements, or extreme dietary "
                          "restrictions are not permitted for safety.",
                "blocked_keywords": blocked
            }

        return {"approved": True, "reason": "Intervention is within safe bounds."}

    def validate_experiment(self, intervention_a: str, intervention_b: str,
                            outcome_metrics: List[str]) -> Dict[str, Any]:
        """Validate both arms of an experiment."""
        check_a = self.validate_intervention(intervention_a)
        if not check_a["approved"]:
            return {**check_a, "arm": "A"}

        check_b = self.validate_intervention(intervention_b)
        if not check_b["approved"]:
            return {**check_b, "arm": "B"}

        return {"approved": True, "reason": "Experiment is within safe bounds."}

    def check_escalation_needed(self, metric_type: str, value: float) -> Optional[Dict[str, Any]]:
        """Check if a metric value crosses clinical concern thresholds."""
        thresholds = CLINICAL_CONCERN_THRESHOLDS.get(metric_type)
        if not thresholds:
            return None

        low = thresholds.get("low")
        high = thresholds.get("high")

        if low is not None and value < low:
            return {
                "escalation": True,
                "metric": metric_type,
                "value": value,
                "threshold": f"below {low} {thresholds['unit']}",
                "message": ESCALATION_MESSAGE
            }

        if high is not None and value > high:
            return {
                "escalation": True,
                "metric": metric_type,
                "value": value,
                "threshold": f"above {high} {thresholds['unit']}",
                "message": ESCALATION_MESSAGE
            }

        return None

    def frame_prediction(self, prediction_text: str) -> str:
        """Wrap a prediction with non-diagnostic framing."""
        return f"{prediction_text}\n\n⚕️ {WELLNESS_DISCLAIMER}"

    def frame_experiment_result(self, result_text: str) -> str:
        """Wrap an experiment result with appropriate caveats."""
        return f"{result_text}\n\n🧪 {EXPERIMENT_DISCLAIMER}"

    def get_wellness_disclaimer(self) -> str:
        return WELLNESS_DISCLAIMER

    def get_escalation_message(self) -> str:
        return ESCALATION_MESSAGE


safety_guardrails = SafetyGuardrails()
