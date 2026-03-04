"""
health_constants.py — Single Source of Truth for all health metrics.

ALL health engines, strategies, and predictions MUST import from here.
NEVER hard-code metric names, thresholds, or risk levels in other files.

Fixes contradictions:
  - Unified canonical metric key names
  - Single risk threshold table (higher score = worse, 0-100)
  - Literal trend semantics (rising/falling/stable, not declining/improving)
  - Clinical thresholds aligned to ADA/AHA guidelines
  - Age default standardized to 35
"""

from __future__ import annotations
from typing import Dict, Any

# ═════════════════════════════════════════════════════════════════
#  Canonical Metric Names  (ALWAYS use these keys — no aliases)
# ═════════════════════════════════════════════════════════════════

class Metric:
    RESTING_HEART_RATE   = "resting_heart_rate"    # NOT "resting_hr" or "heart_rate"
    HEART_RATE           = "heart_rate"             # Spot / active HR reading
    HRV                  = "heart_rate_variability" # NOT "hrv"
    GLUCOSE              = "glucose"                # mg/dL, NOT "glucose_variability"
    SLEEP_DURATION       = "sleep_duration"         # hours, NOT "sleep_hours" / "sleep_quality"
    SLEEP_EFFICIENCY     = "sleep_efficiency"       # % 0-100
    STEPS                = "steps"                  # daily step count
    STRESS_LEVEL         = "stress_level"           # subjective 1-10
    WELLNESS_COMPOSITE   = "wellness_composite"     # 0-100 composite index
    MOOD                 = "mood"                   # subjective 1-10
    ENERGY               = "energy"                 # subjective 1-10
    OXYGEN_SAT           = "oxygen_sat"             # %
    BLOOD_PRESSURE       = "blood_pressure"         # mmHg systolic


# ═════════════════════════════════════════════════════════════════
#  Clinical Thresholds  (ADA / AHA / WHO aligned)
# ═════════════════════════════════════════════════════════════════
#
#  Structure per metric:
#    "warn":      value at which a caution is raised
#    "crit":      value at which escalation is recommended
#    "direction": "higher_is_worse" | "lower_is_worse"
#    "unit":      display string
#    "normal_range": (low, high) tuple of the healthy range
#
#  Risk interpretation:
#    - For "higher_is_worse": value > warn → moderate risk, > crit → high risk
#    - For "lower_is_worse":  value < warn → moderate risk, < crit → high risk
# ─────────────────────────────────────────────────────────────────

METRIC_THRESHOLDS: Dict[str, Dict[str, Any]] = {
    Metric.RESTING_HEART_RATE: {
        "warn": 85,
        "crit": 95,
        "direction": "higher_is_worse",
        "unit": "bpm",
        "normal_range": (60, 80),
        "escalation": 120,          # SafetyGuardrails threshold
        "escalation_low": 40,       # Below this → escalate
    },
    Metric.HEART_RATE: {
        "warn": 100,
        "crit": 110,
        "direction": "higher_is_worse",
        "unit": "bpm",
        "normal_range": (60, 100),  # Standard population (AHA)
        "normal_range_athlete": (40, 100),
        "escalation": 120,
        "escalation_low": 40,
    },
    Metric.HRV: {
        "warn": 35,                 # Below here → warning
        "crit": 20,                 # Below here → critical
        "direction": "lower_is_worse",
        "unit": "ms",
        "normal_range": (40, 100),
        "escalation_low": 10,       # SafetyGuardrails escalation
        "escalation": None,
        "ideal": 55,                # Population median target
        "stress_trigger": 40,       # BehavioralForecaster stress detection
    },
    Metric.GLUCOSE: {
        # ADA fasting glucose staging
        "normal_high": 99,          # Up to 99 = normal
        "warn": 100,                # 100-125 = prediabetic range
        "crit": 126,                # ≥ 126 = diabetes threshold
        "hypo_warn": 70,            # Below 70 = hypoglycemia warning
        "hypo_crit": 54,            # Below 54 = severe hypoglycemia (SafetyGuardrails)
        "hyper_warn": 180,          # Post-meal hyperglycemia
        "hyper_crit": 250,          # Escalation level (SafetyGuardrails)
        "direction": "higher_is_worse",
        "unit": "mg/dL",
        "normal_range": (70, 99),
        "escalation_high": 250,
        "escalation_low": 54,
        "stress_trigger": 120,      # BehavioralForecaster stress proxy
    },
    Metric.SLEEP_DURATION: {
        "warn": 5.5,                # Below 5.5h → warning
        "crit": 4.5,                # Below 4.5h → critical
        "direction": "lower_is_worse",
        "unit": "hours",
        "normal_range": (7.0, 9.0),
        "ideal": 7.5,
        "escalation": None,
        "escalation_low": None,
        "stress_trigger": 6.0,      # BehavioralForecaster stress detection
    },
    Metric.SLEEP_EFFICIENCY: {
        "warn": 75,                 # Below 75% → warning
        "crit": 65,
        "direction": "lower_is_worse",
        "unit": "%",
        "normal_range": (85, 100),
        "ideal": 85,
    },
    Metric.STEPS: {
        "warn": 3000,
        "crit": 1500,
        "direction": "lower_is_worse",
        "unit": "steps/day",
        "normal_range": (7000, 15000),
        "ideal": 8000,
        "intervention_target": 8000,
    },
    Metric.STRESS_LEVEL: {
        "warn": 7,
        "crit": 9,
        "direction": "higher_is_worse",
        "unit": "/10",
        "normal_range": (1, 5),
        "stress_trigger": 6,        # BehavioralForecaster stress detection
    },
    Metric.WELLNESS_COMPOSITE: {
        # Composite 0-100 where 100 = perfect health
        # NOTE: Wellness composite is a HIGHER-IS-BETTER metric.
        # When converted to risk: risk = 100 - wellness
        "warn": 65,                 # Below 65 wellness → moderate risk
        "crit": 45,                 # Below 45 wellness → high risk
        "direction": "lower_is_worse",
        "unit": "score",
        "normal_range": (70, 100),
    },
    Metric.OXYGEN_SAT: {
        "warn": 94,                 # Below 94% → warning
        "crit": 90,
        "direction": "lower_is_worse",
        "unit": "%",
        "normal_range": (95, 100),
        "escalation_low": 90,
        "escalation": None,
    },
    Metric.BLOOD_PRESSURE: {
        "warn": 130,                # Stage 1 hypertension
        "crit": 140,                # Stage 2 hypertension
        "direction": "higher_is_worse",
        "unit": "mmHg systolic",
        "normal_range": (90, 120),
        "escalation": 180,
        "escalation_low": 80,
    },
    Metric.MOOD: {
        "warn": 4,
        "crit": 2,
        "direction": "lower_is_worse",
        "unit": "/10",
        "normal_range": (6, 10),
        "ideal": 7.5,
    },
    Metric.ENERGY: {
        "warn": 4,
        "crit": 2,
        "direction": "lower_is_worse",
        "unit": "/10",
        "normal_range": (6, 10),
        "ideal": 7.0,
    },
}


# ═════════════════════════════════════════════════════════════════
#  Risk Score Scale  (0-100, HIGHER = WORSE everywhere)
# ═════════════════════════════════════════════════════════════════
#
#  Rule: ALL engines must use this table.
#  AncestryEngine's "wellness score" (higher=better) must be
#  converted to risk via:  risk_score = 100 - wellness_score
# ─────────────────────────────────────────────────────────────────

RISK_LEVELS = {
    "critical": {"min": 80, "max": 100, "colour": "#ef4444"},
    "high":     {"min": 55, "max": 79,  "colour": "#f97316"},
    "moderate": {"min": 30, "max": 54,  "colour": "#f59e0b"},
    "low":      {"min": 0,  "max": 29,  "colour": "#10b981"},
}


def risk_level(score: float) -> str:
    """Convert a 0-100 risk score (higher=worse) to a level string."""
    score = max(0.0, min(100.0, float(score)))
    if score >= 80:
        return "critical"
    if score >= 55:
        return "high"
    if score >= 30:
        return "moderate"
    return "low"


def risk_colour(score: float) -> str:
    return RISK_LEVELS[risk_level(score)]["colour"]


def wellness_to_risk(wellness_score: float) -> float:
    """Convert a wellness score (0-100, higher=better) to a risk score (higher=worse)."""
    return max(0.0, min(100.0, 100.0 - float(wellness_score)))


# ═════════════════════════════════════════════════════════════════
#  Trend Semantics  (LITERAL — direction of the value, not health)
# ═════════════════════════════════════════════════════════════════
#
#  All engines return literal direction.
#  To interpret whether a trend is "good" or "bad", use
#  is_trend_worsening() with the metric's direction config.
# ─────────────────────────────────────────────────────────────────

class Trend:
    RISING   = "rising"    # Value is going up
    FALLING  = "falling"   # Value is going down
    STABLE   = "stable"
    UNKNOWN  = "unknown"


def detect_trend(values: list[float], slope_threshold: float = 0.05) -> str:
    """
    Compute literal trend direction from an ordered list of values.
    Returns Trend.RISING | FALLING | STABLE | UNKNOWN.
    Does NOT interpret whether rising is good or bad — use is_trend_worsening().
    """
    if len(values) < 3:
        return Trend.UNKNOWN
    n = len(values)
    x_mean = (n - 1) / 2
    y_mean = sum(values) / n
    num = sum((i - x_mean) * (v - y_mean) for i, v in enumerate(values))
    den = sum((i - x_mean) ** 2 for i in range(n))
    slope = num / den if den else 0.0
    if slope > slope_threshold:
        return Trend.RISING
    if slope < -slope_threshold:
        return Trend.FALLING
    return Trend.STABLE


def is_trend_worsening(metric_key: str, trend: str) -> bool:
    """
    Decide if a trend is worsening for a specific metric.
    Uses the metric's 'direction' config from METRIC_THRESHOLDS.
    """
    if trend == Trend.UNKNOWN or trend == Trend.STABLE:
        return False
    config = METRIC_THRESHOLDS.get(metric_key, {})
    direction = config.get("direction", "higher_is_worse")
    if direction == "higher_is_worse":
        return trend == Trend.RISING
    else:  # lower_is_worse
        return trend == Trend.FALLING


def is_trend_improving(metric_key: str, trend: str) -> bool:
    return not is_trend_worsening(metric_key, trend) and trend != Trend.UNKNOWN


# ═════════════════════════════════════════════════════════════════
#  Age Default  (standardized across all engines)
# ═════════════════════════════════════════════════════════════════

DEFAULT_AGE = 35   # Used when birth_year is unknown


def age_from_birth_year(birth_year: int | None, default: int = DEFAULT_AGE) -> int:
    """Calculate age from birth year with a consistent default."""
    if not birth_year:
        return default
    from datetime import datetime
    return int(max(5, datetime.utcnow().year - int(birth_year)))


# ═════════════════════════════════════════════════════════════════
#  SafetyGuardrails — Exempt Recommendations
# ═════════════════════════════════════════════════════════════════
#
#  Engine-generated evidence-based recommendations that are
#  exempt from BLOCKED_INTERVENTION_KEYWORDS matching.
#  These are dietary/lifestyle nudges, NOT clinical prescriptions.
# ─────────────────────────────────────────────────────────────────

EXEMPT_RECOMMENDATION_PREFIXES = [
    # Environmental matrix immune boosters
    "boost vitamin c",
    "add 30 mg zinc",
    "increase water",
    "hydrate",
    # Behavioral forecaster
    "pre-stage",
    "dark chocolate",
    "nuts",
    # General lifestyle
    "increase sleep",
    "walk after",
    "reduce",
    "avoid",
    "wear",
    "keep windows",
    "shower and change",
]


# ═════════════════════════════════════════════════════════════════
#  Baseline Metrics  (used by CounterfactualEngine and AncestryEngine)
# ═════════════════════════════════════════════════════════════════
#
#  These are *population baseline* absolute values, NOT deltas.
#  Behavior change inputs to CounterfactualEngine should be
#  expressed as DELTAS from these baselines, not absolute values.
# ─────────────────────────────────────────────────────────────────

POPULATION_BASELINES: Dict[str, Dict[str, Any]] = {
    Metric.RESTING_HEART_RATE: {"mean": 68, "std": 8,  "unit": "bpm"},
    Metric.HRV:                {"mean": 45, "std": 12, "unit": "ms"},
    Metric.SLEEP_DURATION:     {"mean": 7.0, "std": 1.0, "unit": "hours"},
    Metric.GLUCOSE:            {"mean": 90, "std": 15, "unit": "mg/dL"},
    Metric.STEPS:              {"mean": 6000, "std": 2000, "unit": "steps/day"},
    Metric.STRESS_LEVEL:       {"mean": 5.0, "std": 2.0, "unit": "/10"},
    Metric.WELLNESS_COMPOSITE: {"mean": 65, "std": 12, "unit": "score"},
    # Legacy aliases used by CounterfactualEngine (keep for compatibility)
    "sleep_quality":           {"mean": 72,  "std": 10, "unit": "%"},
    "glucose_variability":     {"mean": 22,  "std": 8,  "unit": "mg/dL"},
    "mood":                    {"mean": 6.5, "std": 1.5, "unit": "/10"},
    "energy":                  {"mean": 6.0, "std": 1.8, "unit": "/10"},
    "recovery_score":          {"mean": 70,  "std": 12, "unit": "%"},
}


# ═════════════════════════════════════════════════════════════════
#  Behaviour Baseline  (AncestryEngine base habits)
# ═════════════════════════════════════════════════════════════════

BEHAVIOUR_BASELINES: Dict[str, float] = {
    "sleep_hours":          7.0,
    "steps":                6000,
    "hydration_liters":     2.0,
    "meditation_minutes":   0,
    "caffeine_cutoff_hour": 14,
}


# ═════════════════════════════════════════════════════════════════
#  Contagion — Propagation Config
# ═════════════════════════════════════════════════════════════════

CONTAGIOUS_METRICS = [
    Metric.STRESS_LEVEL,
    Metric.SLEEP_DURATION,
    Metric.RESTING_HEART_RATE,
    Metric.HRV,
    Metric.STEPS,
    Metric.WELLNESS_COMPOSITE,
]


# ═════════════════════════════════════════════════════════════════
#  Environmental Matrix — Resilience Weights
# ═════════════════════════════════════════════════════════════════

RESILIENCE_WEIGHTS: Dict[str, Dict[str, Any]] = {
    Metric.SLEEP_DURATION:     {"weight": 0.30, "ideal": 7.5, "direction": "higher_is_better"},
    Metric.HRV:                {"weight": 0.25, "ideal": 55,  "direction": "higher_is_better"},
    Metric.STRESS_LEVEL:       {"weight": 0.20, "ideal": 3,   "direction": "lower_is_better"},
    Metric.STEPS:              {"weight": 0.15, "ideal": 8000, "direction": "higher_is_better"},
    Metric.RESTING_HEART_RATE: {"weight": 0.10, "ideal": 62,  "direction": "lower_is_better"},
}
