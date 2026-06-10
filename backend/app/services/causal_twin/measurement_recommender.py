"""
Next Best Measurement Recommender for Health Causal Twin.
Ranks data sources by expected information gain to reduce prediction uncertainty.
"""
from typing import Dict, Any, List, Optional
from datetime import datetime


# Measurement catalog with expected information gain scores
MEASUREMENT_CATALOG = {
    "cgm_trial": {
        "label": "7-Day CGM Trial",
        "description": "Continuous glucose monitor trial for detailed glycemic patterns",
        "category": "wearable_trial",
        "base_info_gain": 0.85,
        "improves": ["glucose_variability", "energy", "mood", "sleep_quality"],
        "effort": "medium",
        "duration": "7 days",
        "rationale": "CGM data reveals meal-timing and glucose patterns that step counts and sleep logs cannot detect."
    },
    "lab_panel_metabolic": {
        "label": "Metabolic Lab Panel",
        "description": "Fasting glucose, HbA1c, lipid panel, thyroid (TSH, T3, T4)",
        "category": "lab",
        "base_info_gain": 0.78,
        "improves": ["glucose_variability", "energy", "recovery_score"],
        "effort": "low",
        "duration": "one-time",
        "rationale": "Lab results differentiate metabolic causes of fatigue from behavioral ones."
    },
    "lab_panel_anemia": {
        "label": "Iron & Anemia Panel",
        "description": "Ferritin, iron, TIBC, B12, folate",
        "category": "lab",
        "base_info_gain": 0.72,
        "improves": ["energy", "recovery_score", "mood"],
        "effort": "low",
        "duration": "one-time",
        "rationale": "Subclinical iron deficiency is a common cause of unexplained fatigue."
    },
    "sleep_journal": {
        "label": "7-Day Sleep Journal",
        "description": "Detailed bedtime routine, wake times, sleep quality subjective scores",
        "category": "journal",
        "base_info_gain": 0.65,
        "improves": ["sleep_quality", "hrv", "mood", "energy"],
        "effort": "low",
        "duration": "7 days",
        "rationale": "Subjective sleep quality plus routine details fill gaps wearable data misses."
    },
    "mood_journal": {
        "label": "Daily Mood & Energy Log",
        "description": "Brief morning and evening mood/energy/stress ratings",
        "category": "journal",
        "base_info_gain": 0.60,
        "improves": ["mood", "energy", "recovery_score"],
        "effort": "low",
        "duration": "ongoing",
        "rationale": "Subjective well-being data anchors objective metrics to your lived experience."
    },
    "nutrition_log": {
        "label": "3-Day Nutrition Log",
        "description": "Detailed meal timing, macros, hydration tracking",
        "category": "journal",
        "base_info_gain": 0.70,
        "improves": ["glucose_variability", "energy", "mood", "recovery_score"],
        "effort": "medium",
        "duration": "3 days",
        "rationale": "Nutrition timing data enables the model to distinguish dietary effects from other variables."
    },
    "hrv_wearable": {
        "label": "HRV-Capable Wearable",
        "description": "Wearable with continuous HRV tracking (Oura, Whoop, Garmin)",
        "category": "wearable",
        "base_info_gain": 0.80,
        "improves": ["hrv", "recovery_score", "resting_hr", "sleep_quality"],
        "effort": "medium",
        "duration": "ongoing",
        "rationale": "HRV is the strongest single predictor of recovery and stress adaptation."
    },
    "medication_timing": {
        "label": "Medication Timing Log",
        "description": "Track exact times of any regular medications or supplements",
        "category": "journal",
        "base_info_gain": 0.55,
        "improves": ["energy", "mood", "sleep_quality"],
        "effort": "low",
        "duration": "ongoing",
        "rationale": "Medication timing can cause confounding effects that mask lifestyle improvements."
    }
}


class MeasurementRecommender:
    """Recommends the most valuable next data source to reduce uncertainty."""

    def rank_measurements(
        self,
        user_id: str,
        available_data: Optional[List[str]] = None,
        weak_predictions: Optional[List[str]] = None,
        limit: int = 5
    ) -> List[Dict[str, Any]]:
        """
        Rank measurements by expected information gain.

        Args:
            user_id: User identifier
            available_data: Data sources already available (to deprioritize)
            weak_predictions: Metrics with low confidence (to prioritize)
            limit: Max recommendations to return
        """
        available = set(available_data or [])
        weak = set(weak_predictions or [])

        scored = []
        for key, measurement in MEASUREMENT_CATALOG.items():
            # Skip if user already has this data source
            if key in available:
                continue

            # Compute adjusted info gain
            base = measurement["base_info_gain"]

            # Boost if it improves metrics that have weak predictions
            overlap = weak.intersection(set(measurement["improves"]))
            weak_boost = len(overlap) * 0.08

            # Penalize high-effort measurements slightly
            effort_penalty = {"low": 0, "medium": 0.05, "high": 0.10}.get(
                measurement["effort"], 0
            )

            adjusted_gain = min(1.0, base + weak_boost - effort_penalty)

            scored.append({
                "measurement_type": key,
                "label": measurement["label"],
                "description": measurement["description"],
                "category": measurement["category"],
                "expected_info_gain": round(adjusted_gain, 2),
                "improves_predictions_for": measurement["improves"],
                "effort": measurement["effort"],
                "duration": measurement["duration"],
                "rationale": measurement["rationale"],
                "priority_rank": 0  # Set below
            })

        # Sort by info gain (highest first)
        scored.sort(key=lambda x: x["expected_info_gain"], reverse=True)

        # Assign priority ranks
        for i, item in enumerate(scored):
            item["priority_rank"] = i + 1

        return scored[:limit]

    def explain_measurement(self, measurement_type: str) -> Optional[Dict[str, Any]]:
        """Get detailed explanation for a specific measurement."""
        measurement = MEASUREMENT_CATALOG.get(measurement_type)
        if not measurement:
            return None

        return {
            "type": measurement_type,
            **measurement,
            "why_it_matters": (
                f"{measurement['label']} would improve predictions for "
                f"{', '.join(measurement['improves'])}. "
                f"{measurement['rationale']}"
            )
        }


measurement_recommender = MeasurementRecommender()
