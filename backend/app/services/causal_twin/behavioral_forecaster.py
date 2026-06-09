"""
Behavioral Forecaster — Psychographic health-failure prediction.

Cross-references real-time biomarker stress signatures (HR, HRV, sleep)
with Big Five (OCEAN) personality dimensions to predict *how* a person
will fail their health goals, then generates personality-tailored
intervention strategies.

Fixes contradiction: STRESS_SIGNATURES thresholds now sourced from
health_constants — consistent RHR (85), HRV (40), sleep (6.0), stress (6)
triggers. Glucose added as proxy (120 mg/dL) per ADA prediabetic staging.

Used by St. Raphael (individual nudges) and St. Joseph (family coaching).
"""

from __future__ import annotations

import uuid
from datetime import datetime
from typing import Any, Dict, List, Optional

from app.services.health.health_constants import (
    METRIC_THRESHOLDS, Metric,
)

# ── Stress-state detection thresholds ────────────────────────────

STRESS_SIGNATURES = {
    "resting_heart_rate":     {"threshold": 78, "direction": "above"},
    "heart_rate":             {"threshold": 82, "direction": "above"},
    "heart_rate_variability": {"threshold": 40, "direction": "below"},
    "sleep_duration":         {"threshold": 6.0, "direction": "below"},
    "stress_level":           {"threshold": 6, "direction": "above"},
}

# ── Failure-mode mapping: (stress_state × OCEAN dimension) ──────
#    High-N → anxiety-driven binge/compulsion
#    Low-C  → avoidance/procrastination
#    Low-E  → social withdrawal / isolation
#    Low-A  → irritability / conflict-driven derailment
#    High-O → novelty-seeking derailment (drops routine for new thing)

FAILURE_MODES = {
    "high_neuroticism":       {
        "mode": "anxiety_compulsion",
        "label": "Anxiety-driven compulsion",
        "description": (
            "Under stress, high-Neuroticism individuals tend toward "
            "emotional eating, compulsive checking, or sleep-disrupting "
            "rumination cycles."
        ),
    },
    "low_conscientiousness":  {
        "mode": "avoidance",
        "label": "Goal avoidance",
        "description": (
            "Under stress, low-Conscientiousness individuals tend to "
            "skip planned workouts, ignore medication schedules, and "
            "defer health commitments."
        ),
    },
    "low_extraversion":       {
        "mode": "social_withdrawal",
        "label": "Social withdrawal",
        "description": (
            "Under stress, introverted individuals may isolate further, "
            "missing the protective benefits of social connection and "
            "reducing activity levels."
        ),
    },
    "low_agreeableness":      {
        "mode": "conflict_derailment",
        "label": "Conflict-driven derailment",
        "description": (
            "Under stress, low-Agreeableness individuals may engage in "
            "interpersonal conflicts that elevate cortisol and disrupt "
            "household health dynamics."
        ),
    },
    "high_openness":          {
        "mode": "novelty_abandonment",
        "label": "Routine abandonment",
        "description": (
            "Under stress, high-Openness individuals may abandon proven "
            "health routines in favour of untested alternatives, losing "
            "consistency."
        ),
    },
}

# ── Personality-tailored interventions ───────────────────────────

INTERVENTIONS = {
    "anxiety_compulsion": [
        {
            "strategy": "gentle_grounding",
            "title": "Grounding Breathwork",
            "description": "4-7-8 breathing: inhale 4s, hold 7s, exhale 8s. Repeat 3×.",
            "tone": "warm",
            "frequency": "when anxious",
        },
        {
            "strategy": "reframe",
            "title": "Cognitive Reframe Prompt",
            "description": "Write down the anxious thought, then write one alternative explanation.",
            "tone": "warm",
            "frequency": "evening journal",
        },
        {
            "strategy": "safe_substitute",
            "title": "Safe Substitute Snack",
            "description": "Pre-stage a small portion of dark chocolate or nuts to satisfy compulsive eating urges without sugar spikes.",
            "tone": "warm",
            "frequency": "as needed",
        },
    ],
    "avoidance": [
        {
            "strategy": "micro_commitment",
            "title": "2-Minute Rule",
            "description": "Commit to just 2 minutes of the skipped activity. Once started, momentum usually carries you.",
            "tone": "firm_encouraging",
            "frequency": "per skipped activity",
        },
        {
            "strategy": "gamified_streak",
            "title": "Streak Challenge",
            "description": "Every day you hit your target = +1 streak. Break it and it resets. Can you beat your record?",
            "tone": "competitive",
            "frequency": "daily",
        },
        {
            "strategy": "accountability_buddy",
            "title": "Family Accountability",
            "description": "St. Joseph can pair you with a family member for mutual check-ins.",
            "tone": "firm_encouraging",
            "frequency": "daily",
        },
    ],
    "social_withdrawal": [
        {
            "strategy": "micro_social",
            "title": "One-Text Rule",
            "description": "Send one text to a friend or family member today. Just one.",
            "tone": "gentle",
            "frequency": "daily",
        },
        {
            "strategy": "shared_activity",
            "title": "Parallel Activity",
            "description": "Do your workout/walk alongside a family member — no conversation required.",
            "tone": "gentle",
            "frequency": "3×/week",
        },
    ],
    "conflict_derailment": [
        {
            "strategy": "cool_down",
            "title": "90-Second Pause",
            "description": "When triggered, step away for 90 seconds. Cortisol begins clearing in ~90s.",
            "tone": "neutral",
            "frequency": "per conflict",
        },
        {
            "strategy": "structured_expression",
            "title": "I-Statement Practice",
            "description": "Rephrase complaints as 'I feel ___ when ___ because ___'. Reduces conflict escalation.",
            "tone": "neutral",
            "frequency": "as needed",
        },
    ],
    "novelty_abandonment": [
        {
            "strategy": "anchor_routine",
            "title": "Non-Negotiable Anchor",
            "description": "Keep ONE health habit fixed no matter what else changes (e.g., always walk after dinner).",
            "tone": "encouraging",
            "frequency": "daily",
        },
        {
            "strategy": "experiment_framing",
            "title": "Structured Experiment",
            "description": "Want to try something new? Frame it as a 2-week experiment with measurable outcomes before replacing your current routine.",
            "tone": "encouraging",
            "frequency": "per change",
        },
    ],
}


# ═════════════════════════════════════════════════════════════════
#  BehavioralForecaster
# ═════════════════════════════════════════════════════════════════

class BehavioralForecaster:
    """
    Predicts personality-specific health-failure modes and generates
    tailored interventions.

    Usage:
        from app.services.causal_twin.behavioral_forecaster import behavioral_forecaster
        result = await behavioral_forecaster.forecast_behavior(
            user_id, recent_metrics, personality_profile
        )
    """

    # ── Public API ───────────────────────────────────────────────

    async def forecast_behavior(
        self,
        user_id: str,
        recent_metrics: List[Dict[str, Any]],
        personality_profile: Optional[Dict[str, Any]] = None,
    ) -> Dict[str, Any]:
        """
        Detect the user's current stress state, predict likely failure
        mode based on personality, and return tailored interventions.
        """
        stress_state = self._detect_stress_state(recent_metrics)
        ocean_scores = self._extract_ocean(personality_profile)
        failure_modes = self._predict_failure_modes(stress_state, ocean_scores)
        interventions = self._select_interventions(failure_modes, ocean_scores)

        overall_risk = "low"
        if stress_state["is_stressed"] and failure_modes:
            overall_risk = "high" if len(failure_modes) >= 2 else "moderate"

        return {
            "forecast_id": str(uuid.uuid4()),
            "user_id": user_id,
            "generated_at": datetime.utcnow().isoformat(),
            "stress_state": stress_state,
            "ocean_scores": ocean_scores,
            "predicted_failure_modes": failure_modes,
            "interventions": interventions,
            "behavioral_risk_level": overall_risk,
            "narrative": self._build_narrative(
                stress_state, failure_modes, interventions
            ),
        }

    async def get_behavioral_risk(
        self,
        user_id: str,
        recent_metrics: List[Dict[str, Any]],
        personality_profile: Optional[Dict[str, Any]] = None,
    ) -> Dict[str, Any]:
        """Convenience wrapper for API layer."""
        return await self.forecast_behavior(
            user_id, recent_metrics, personality_profile
        )

    # ── Private helpers ──────────────────────────────────────────

    def _detect_stress_state(
        self, metrics: List[Dict[str, Any]]
    ) -> Dict[str, Any]:
        """Identify whether the user is in a physiological stress state."""
        triggers: List[str] = []
        metric_vals: Dict[str, float] = {}

        for m in metrics:
            mt = m.get("metric_type", "")
            v = m.get("value")
            if v is None:
                continue
            # Keep the latest value per metric
            metric_vals[mt] = float(v)

        for metric, spec in STRESS_SIGNATURES.items():
            val = metric_vals.get(metric)
            if val is None:
                continue
            if spec["direction"] == "above" and val > spec["threshold"]:
                triggers.append(metric)
            elif spec["direction"] == "below" and val < spec["threshold"]:
                triggers.append(metric)

        stress_intensity = min(len(triggers) / max(len(STRESS_SIGNATURES), 1), 1.0)

        return {
            "is_stressed": len(triggers) >= 2,
            "stress_intensity": round(stress_intensity, 2),
            "trigger_metrics": triggers,
            "metric_snapshot": metric_vals,
        }

    def _extract_ocean(
        self, profile: Optional[Dict[str, Any]]
    ) -> Dict[str, float]:
        """Extract OCEAN scores from personality profile (defaults to 50)."""
        if not profile:
            return {
                "openness": 50, "conscientiousness": 50, "extraversion": 50,
                "agreeableness": 50, "neuroticism": 50,
            }

        scores = profile.get("scores", {})
        # Normalise keys
        return {
            "openness": scores.get("openness", scores.get("Openness", 50)),
            "conscientiousness": scores.get("conscientiousness", scores.get("Conscientiousness", 50)),
            "extraversion": scores.get("extraversion", scores.get("Extraversion", 50)),
            "agreeableness": scores.get("agreeableness", scores.get("Agreeableness", 50)),
            "neuroticism": scores.get("neuroticism", scores.get("Neuroticism", 50)),
        }

    def _predict_failure_modes(
        self,
        stress: Dict[str, Any],
        ocean: Dict[str, float],
    ) -> List[Dict[str, Any]]:
        """Map stress + personality → predicted failure modes."""
        if not stress["is_stressed"]:
            return []

        modes: List[Dict[str, Any]] = []

        if ocean["neuroticism"] >= 60:
            fm = FAILURE_MODES["high_neuroticism"].copy()
            fm["probability"] = round(0.5 + (ocean["neuroticism"] - 60) / 100, 2)
            modes.append(fm)

        if ocean["conscientiousness"] < 40:
            fm = FAILURE_MODES["low_conscientiousness"].copy()
            fm["probability"] = round(0.5 + (40 - ocean["conscientiousness"]) / 100, 2)
            modes.append(fm)

        if ocean["extraversion"] < 35:
            fm = FAILURE_MODES["low_extraversion"].copy()
            fm["probability"] = round(0.4 + (35 - ocean["extraversion"]) / 100, 2)
            modes.append(fm)

        if ocean["agreeableness"] < 35:
            fm = FAILURE_MODES["low_agreeableness"].copy()
            fm["probability"] = round(0.4 + (35 - ocean["agreeableness"]) / 100, 2)
            modes.append(fm)

        if ocean["openness"] >= 70:
            fm = FAILURE_MODES["high_openness"].copy()
            fm["probability"] = round(0.3 + (ocean["openness"] - 70) / 100, 2)
            modes.append(fm)

        # Sort by probability descending
        modes.sort(key=lambda x: x.get("probability", 0), reverse=True)
        return modes

    def _select_interventions(
        self,
        failure_modes: List[Dict[str, Any]],
        ocean: Dict[str, float],
    ) -> List[Dict[str, Any]]:
        """Select interventions tailored to the predicted failure modes."""
        selected: List[Dict[str, Any]] = []

        for fm in failure_modes:
            mode = fm.get("mode", "")
            mode_interventions = INTERVENTIONS.get(mode, [])
            for iv in mode_interventions[:2]:  # Top 2 per failure mode
                selected.append({
                    **iv,
                    "for_failure_mode": mode,
                    "for_label": fm.get("label", ""),
                })

        return selected[:6]  # Cap total at 6

    def _build_narrative(
        self,
        stress: Dict[str, Any],
        modes: List[Dict[str, Any]],
        interventions: List[Dict[str, Any]],
    ) -> str:
        if not stress["is_stressed"]:
            return (
                "Your biomarkers indicate a calm physiological state. "
                "No behavioral risk patterns detected — keep it up!"
            )

        triggers = ", ".join(
            t.replace("_", " ") for t in stress["trigger_metrics"]
        )
        parts = [
            f"Your biomarkers ({triggers}) indicate elevated stress "
            f"(intensity: {stress['stress_intensity']:.0%})."
        ]

        if modes:
            top = modes[0]
            parts.append(
                f"Based on your personality profile, the most likely "
                f"failure mode is '{top['label']}' "
                f"(probability: {top.get('probability', 0):.0%})."
            )

        if interventions:
            parts.append(
                f"We recommend starting with: {interventions[0]['title']}."
            )

        return " ".join(parts)

    # ── Trinity Synapse bridge ────────────────────────────────

    def apply_ocean_profile(
        self,
        ocean_scores: Dict[str, float],
        base_interventions: List[Dict[str, Any]],
    ) -> List[Dict[str, Any]]:
        """
        Reorder and annotate interventions based on OCEAN scores from
        TrinitySynapse.personality_interventions().

        ocean_scores: {"O": 0-100, "C": 0-100, "E": 0-100, "A": 0-100, "N": 0-100}
        Returns interventions sorted by personality fit — best match first.
        """
        N = float(ocean_scores.get("N", 50))
        C = float(ocean_scores.get("C", 50))
        E = float(ocean_scores.get("E", 50))
        A = float(ocean_scores.get("A", 50))
        O = float(ocean_scores.get("O", 50))

        def _score(iv: Dict[str, Any]) -> float:
            strategy = iv.get("strategy", "")
            tone = iv.get("tone", "")
            # Prioritise gentle/warm for high-N
            if N >= 65 and tone in ("warm", "gentle_grounding"):
                return 10.0
            # Prioritise structured for high-C
            if C >= 65 and strategy in ("micro_commitment", "gamified_streak"):
                return 9.0
            # Prioritise social for high-E
            if E >= 65 and strategy in ("accountability_buddy", "social"):
                return 8.0
            # Prioritise self-care for high-A (caregiver burnout risk)
            if A >= 65 and "self" in iv.get("title", "").lower():
                return 7.0
            # Low curiosity / openness — prefer familiar
            if O <= 35 and strategy in ("habit_anchor", "environmental_design"):
                return 6.0
            return 1.0

        ranked = sorted(base_interventions, key=_score, reverse=True)
        # Annotate with personality context
        for iv in ranked[:3]:
            iv["personality_fit"] = (
                f"Prioritised for your OCEAN profile "
                f"(N={N:.0f}, C={C:.0f}, E={E:.0f})"
            )
        return ranked


# ── Singleton ────────────────────────────────────────────────────

behavioral_forecaster = BehavioralForecaster()
