"""
Uncertainty Engine for Health Causal Twin.
Produces confidence scores, data sufficiency indicators,
correlation-vs-causal evidence labels, and contradiction detection.
"""
from typing import Dict, Any, List, Optional
from datetime import datetime


class ConfidenceLevel:
    HIGH = "high"        # 80-100%
    MODERATE = "moderate"  # 50-79%
    LOW = "low"          # 0-49%

CONFIDENCE_EXPLANATIONS = {
    "high": "Supported by 30+ days of consistent data or validated through your personal experiment.",
    "moderate": "Based on correlational patterns. Additional data or an experiment could strengthen this.",
    "low": "Insufficient or inconsistent data. This is a preliminary observation, not a reliable pattern."
}

EVIDENCE_TYPE_LABELS = {
    "causal_trial": "Supported by your own N-of-1 experiment",
    "strong_correlation": "Strong statistical correlation in your data",
    "weak_correlation": "Some signal detected but noisy data",
    "population_prior": "Based on general health research, not personalized",
    "clinician_entered": "Input directly from a healthcare provider"
}


class UncertaintyEngine:
    """Assesses confidence, detects contradictions, and labels evidence types."""

    def assess_confidence(
        self,
        data_days: int,
        data_completeness: float,
        has_experiment: bool = False,
        contradictions_count: int = 0
    ) -> Dict[str, Any]:
        """
        Compute a confidence score and level based on data quality.

        Args:
            data_days: Number of days of relevant data
            data_completeness: 0.0-1.0 ratio of expected vs available data points
            has_experiment: Whether a personal N-of-1 trial supports this
            contradictions_count: Number of contradicting data points
        """
        # Base score from data volume
        volume_score = min(data_days / 30.0, 1.0) * 40  # Max 40 points

        # Completeness score
        completeness_score = data_completeness * 30  # Max 30 points

        # Experiment bonus
        experiment_bonus = 25 if has_experiment else 0  # Max 25 points

        # Consistency penalty
        consistency_penalty = min(contradictions_count * 5, 20)  # Max -20 points

        # Final score 0-100
        raw_score = volume_score + completeness_score + experiment_bonus - consistency_penalty
        score = max(0, min(100, raw_score))

        # Level
        if score >= 80:
            level = ConfidenceLevel.HIGH
        elif score >= 50:
            level = ConfidenceLevel.MODERATE
        else:
            level = ConfidenceLevel.LOW

        return {
            "score": round(score, 1),
            "level": level,
            "explanation": CONFIDENCE_EXPLANATIONS[level],
            "breakdown": {
                "data_volume": round(volume_score, 1),
                "data_completeness": round(completeness_score, 1),
                "experiment_bonus": experiment_bonus,
                "consistency_penalty": -consistency_penalty
            }
        }

    def assess_data_sufficiency(
        self,
        available_metrics: List[str],
        required_metrics: List[str],
        data_days: int,
        min_days: int = 7
    ) -> Dict[str, Any]:
        """Evaluate whether there's enough data for a reliable prediction."""
        missing = [m for m in required_metrics if m not in available_metrics]
        coverage = len([m for m in required_metrics if m in available_metrics]) / max(len(required_metrics), 1)
        days_sufficient = data_days >= min_days

        return {
            "sufficient": len(missing) == 0 and days_sufficient,
            "coverage": round(coverage, 2),
            "missing_metrics": missing,
            "data_days": data_days,
            "min_days_required": min_days,
            "days_sufficient": days_sufficient,
            "message": self._sufficiency_message(missing, data_days, min_days)
        }

    def _sufficiency_message(self, missing: List[str], days: int, min_days: int) -> str:
        parts = []
        if missing:
            parts.append(f"Missing data: {', '.join(missing)}")
        if days < min_days:
            parts.append(f"Only {days} days of data (need at least {min_days})")
        if not parts:
            return "Data sufficiency: Good. Enough data for a meaningful analysis."
        return "Data gaps detected: " + ". ".join(parts) + "."

    def label_evidence_type(
        self,
        has_experiment: bool,
        correlation_strength: float,
        is_clinician_input: bool = False
    ) -> Dict[str, Any]:
        """Determine the evidence type label for a recommendation."""
        if is_clinician_input:
            etype = "clinician_entered"
        elif has_experiment:
            etype = "causal_trial"
        elif correlation_strength >= 0.7:
            etype = "strong_correlation"
        elif correlation_strength >= 0.3:
            etype = "weak_correlation"
        else:
            etype = "population_prior"

        return {
            "type": etype,
            "label": EVIDENCE_TYPE_LABELS[etype],
            "is_causal": etype in ("causal_trial", "clinician_entered")
        }

    def detect_contradictions(
        self,
        prediction_history: List[Dict[str, Any]],
        current_observation: Dict[str, Any]
    ) -> List[Dict[str, Any]]:
        """
        Check if new data contradicts earlier predictions/recommendations.
        Returns list of contradictions found.
        """
        contradictions = []
        observed_metric = current_observation.get("metric")
        observed_direction = current_observation.get("direction")  # "improved", "declined", "stable"

        for pred in prediction_history:
            predicted_direction = pred.get("predicted_direction")
            if predicted_direction and observed_direction and predicted_direction != observed_direction:
                contradictions.append({
                    "prediction_id": pred.get("id"),
                    "predicted": predicted_direction,
                    "observed": observed_direction,
                    "metric": observed_metric,
                    "message": f"Earlier prediction expected {observed_metric} to {predicted_direction}, "
                              f"but it actually {observed_direction}.",
                    "detected_at": datetime.utcnow().isoformat()
                })

        return contradictions


uncertainty_engine = UncertaintyEngine()
