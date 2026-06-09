"""
Ancestry Engine: Bridges St. Joseph's family tree with St. Raphael's Causal Twin.

Given a family member's traits, age, occupation and generational data,
this engine produces multi-decade health trajectory predictions.

Fixes contradiction: age default now 35 (from health_constants).
Risk/wellness score is converted to canonical 0-100 risk scale.
"""
from __future__ import annotations

import math
import random
from datetime import datetime
from typing import Any, List, Dict
from sqlalchemy import select
from sqlalchemy.exc import ProgrammingError
from app.db.session import get_session_factory
from app.models.genealogy import FamilyNode
from app.services.causal_twin.counterfactual_engine import counterfactual_engine
from app.services.causal_twin.uncertainty_engine import uncertainty_engine
from app.services.causal_twin.safety_guardrails import safety_guardrails
from app.services.health.health_constants import (
    age_from_birth_year, risk_level, wellness_to_risk,
    BEHAVIOUR_BASELINES, DEFAULT_AGE,
)
import logging

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Trait → behaviour proxy mappings
# ---------------------------------------------------------------------------
TRAIT_BEHAVIOUR_MAP: dict[str, dict[str, float]] = {
    # Positive traits boost protective behaviours
    "disciplined":      {"sleep_hours": 0.5, "steps": 1000, "meditation_minutes": 5},
    "active":           {"steps": 2000, "hydration_liters": 0.25},
    "calm":             {"meditation_minutes": 10, "sleep_hours": 0.25},
    "social":           {"mood": 0.1},
    "creative":         {"meditation_minutes": 5},
    "empathetic":       {"mood": 0.05},
    "optimistic":       {"mood": 0.1, "sleep_hours": 0.25},
    # Negative traits reduce protective behaviours
    "anxious":          {"sleep_hours": -0.5, "meditation_minutes": -5, "mood": -0.1},
    "sedentary":        {"steps": -2000, "hydration_liters": -0.25},
    "workaholic":       {"sleep_hours": -1, "steps": -1000},
    "stressed":         {"sleep_hours": -0.5, "steps": -500, "mood": -0.1},
    "impulsive":        {"sleep_hours": -0.25},
    "introverted":      {"steps": -500},
}

OCCUPATION_RISK: dict[str, float] = {
    "nurse":          0.85,   "doctor":         0.80,
    "teacher":        0.88,   "engineer":       0.90,
    "athlete":        0.95,   "artist":         0.87,
    "farmer":         0.82,   "executive":      0.75,
    "military":       0.78,   "laborer":        0.72,
    "software":       0.86,   "student":        0.92,
}

BASE_BEHAVIOURS = {k: float(v) for k, v in BEHAVIOUR_BASELINES.items()}


def _age_from_birth_year(birth_year: int | None) -> int:
    """Delegate to shared health_constants (default age = 35)."""
    return age_from_birth_year(birth_year)


def _traits_to_behaviours(traits: list[str]) -> dict[str, float]:
    behaviours = {k: float(v) for k, v in BASE_BEHAVIOURS.items()}
    for trait in [t.lower() for t in traits]:
        for key, delta in TRAIT_BEHAVIOUR_MAP.get(trait, {}).items():
            behaviours[key] = behaviours.get(key, 0) + delta
    # Clamp
    behaviours["sleep_hours"] = max(4.0, min(10.0, behaviours["sleep_hours"]))
    behaviours["steps"] = max(1000, min(15000, behaviours["steps"]))
    behaviours["hydration_liters"] = max(0.5, min(4.0, behaviours["hydration_liters"]))
    behaviours["meditation_minutes"] = max(0, min(30, behaviours["meditation_minutes"]))
    return behaviours


def _occupation_modifier(occupation: str | None) -> float:
    if not occupation:
        return 1.0
    key = occupation.lower()
    for k, v in OCCUPATION_RISK.items():
        if k in key:
            return v
    return 0.87  # default moderate


def _generation_risk_factor(generation: int) -> float:
    """Earlier generations have less data completeness."""
    return max(0.3, min(1.0, 0.5 + generation * 0.1))


# ---------------------------------------------------------------------------
# Public API
# ---------------------------------------------------------------------------

class AncestryEngine:

    async def predict_member_trajectory(
        self,
        member_id: str,
        first_name: str,
        last_name: str,
        traits: list[str],
        birth_year: int | None,
        occupation: str | None,
        generation: int,
    ) -> dict[str, Any]:
        """Run a 10/20/30 year health trajectory for one family member."""

        age = _age_from_birth_year(birth_year)
        behaviours = _traits_to_behaviours(traits)
        occ_mod = _occupation_modifier(occupation)
        gen_completeness = _generation_risk_factor(generation)

        # Ask the counterfactual engine with their estimated behaviours
        simulation = await counterfactual_engine.simulate_scenarios(
            user_id=f"ancestry:{member_id}",
            behavior_changes=behaviours,
            target_metrics=["hrv", "sleep_quality", "energy", "mood", "resting_hr"],
            horizons=[365 * 10, 365 * 20, 365 * 30],   # 10 / 20 / 30 years
            user_history_days=max(1, (age - 18) * 365),
            data_completeness=gen_completeness * 0.6,
        )

        # Apply occupation modifier to all mid-point projections
        for metric, horizons in simulation.get("projections", {}).items():
            for h_key, h_data in horizons.items():
                if isinstance(h_data, dict) and "mid" in h_data:
                    h_data["mid"] = round(float(h_data["mid"]) * occ_mod, 1)

        # Top risk factors
        risk_factors = _derive_risk_factors(traits, occupation, age)

        # Suggested interventions
        interventions = _suggest_interventions(behaviours, risk_factors)

        safety_guardrails.get_wellness_disclaimer()

        return {
            "member_id": member_id,
            "member_name": f"{first_name} {last_name}",
            "age": age,
            "traits_analysed": traits,
            "occupation": occupation,
            "estimated_behaviours": behaviours,
            "projections": simulation.get("projections", {}),
            "confidence": simulation.get("confidence", {}),
            "evidence": simulation.get("evidence", {}),
            "risk_factors": risk_factors,
            "interventions": interventions,
            "narrative": simulation.get("narrative", ""),
            "disclaimer": safety_guardrails.get_wellness_disclaimer(),
            "generated_at": datetime.utcnow().isoformat(),
        }

    async def get_family_health_map_for_user(self, user_id: str) -> List[Dict[str, Any]]:
        """Fetch real family nodes from DB and generate a risk heat-map."""
        session_factory = get_session_factory()
        async with session_factory() as session:
            query = select(FamilyNode).where(FamilyNode.user_id == user_id)
            try:
                result = await session.execute(query)
                nodes = result.scalars().all()
            except ProgrammingError as exc:
                logger.warning(
                    "Falling back to an empty family risk map because the family_nodes table is unavailable for user %s: %s",
                    user_id,
                    exc,
                )
                await session.rollback()
                return []
            
            members = []
            for node in nodes:
                # Extract traits from health_metrics JSON or similar
                metrics = node.health_metrics or {}
                traits = metrics.get("traits", [])
                
                members.append({
                    "id": node.id,
                    "firstName": node.name.split(" ")[0] if " " in node.name else node.name,
                    "lastName": node.name.split(" ")[1] if " " in node.name else "",
                    "traits": traits,
                    "occupation": metrics.get("occupation"),
                    "generation": metrics.get("generation", 1),
                    "birthYear": int(node.birth_date.split("-")[0]) if node.birth_date else None
                })
            
            return await self.get_family_health_map(members)

    async def get_family_health_map(
        self,
        members: list[dict],
    ) -> list[dict[str, Any]]:
        """Lightweight risk heat-map for every living family member."""
        results = []
        for m in members:
            traits = m.get("traits", [])
            occ = m.get("occupation")
            gen = m.get("generation", 1)
            birth_year = m.get("birthYear")
            age = _age_from_birth_year(birth_year)

            behaviours = _traits_to_behaviours(traits)
            occ_mod = _occupation_modifier(occ)
            gen_score = _generation_risk_factor(gen)

            # Compute wellness score
            sleep_score = (behaviours["sleep_hours"] - 4.0) / 6.0 * 100.0
            steps_score = behaviours["steps"] / 15000.0 * 100.0
            hydration_score = behaviours["hydration_liters"] / 4.0 * 100.0
            meditation_score = min(100.0, behaviours["meditation_minutes"] * 3.33)
            
            base_score = (sleep_score * 0.3 + steps_score * 0.3
                          + hydration_score * 0.2 + meditation_score * 0.2)
            wellness = base_score * occ_mod * gen_score

            # Age adjustment
            if age > 60:
                wellness *= 0.85
            elif age > 45:
                wellness *= 0.92

            wellness = max(0.0, min(100.0, wellness))

            # Convert wellness → risk (canonical scale: higher = worse)
            risk_score = wellness_to_risk(wellness)
            r_level = risk_level(risk_score)
            colour = {"low": "#10b981", "moderate": "#f59e0b",
                      "high": "#f97316", "critical": "#ef4444"}.get(r_level, "#f59e0b")

            results.append({
                "member_id": m.get("id"),
                "member_name": f"{m.get('firstName', '')} {m.get('lastName', '')}".strip(),
                "wellness_score": round(wellness, 1),
                "risk_score": round(risk_score, 1),
                "risk_level": r_level,
                "colour": colour,
                "top_risk": _derive_risk_factors(traits, occ, age)[:1],
            })

        return results


# ---------------------------------------------------------------------------
# Internal helpers
# ---------------------------------------------------------------------------

def _derive_risk_factors(traits: list[str], occupation: str | None, age: int) -> list[dict]:
    factors = []

    negative = {"anxious", "sedentary", "workaholic", "stressed", "impulsive"}
    found = [t for t in [x.lower() for x in traits] if t in negative]
    for t in found:
        factors.append({"factor": t.capitalize() + " personality pattern",
                        "impact": "moderate", "modifiable": True})

    occ_lower = (occupation or "").lower()
    if any(x in occ_lower for x in ["executive", "military", "laborer"]):
        factors.append({"factor": "High-stress occupation", "impact": "moderate", "modifiable": False})

    if age > 50:
        factors.append({"factor": "Age-related baseline decline", "impact": "low", "modifiable": False})
    elif age < 18:
        factors.append({"factor": "Young — in formative health window", "impact": "positive", "modifiable": True})

    if not factors:
        factors.append({"factor": "No major risk factors detected", "impact": "positive", "modifiable": True})

    return factors[:4]


def _suggest_interventions(behaviours: dict, risk_factors: list[dict]) -> list[dict]:
    """Return top 3 lifestyle changes most likely to help this person."""
    suggestions = []

    if behaviours["sleep_hours"] < 7:
        suggestions.append({
            "action": "Improve sleep to 7–8 hours",
            "expected_gain": "↑ HRV, ↑ energy, ↑ mood",
            "difficulty": "medium",
        })
    if behaviours["steps"] < 7000:
        suggestions.append({
            "action": "Increase daily movement to 8,000+ steps",
            "expected_gain": "↑ cardiovascular health, ↑ glucose stability",
            "difficulty": "medium",
        })
    if behaviours["meditation_minutes"] < 5:
        suggestions.append({
            "action": "Add 10 min of mindfulness daily",
            "expected_gain": "↓ anxiety, ↑ HRV, ↑ sleep quality",
            "difficulty": "low",
        })
    if behaviours["hydration_liters"] < 1.5:
        suggestions.append({
            "action": "Increase water intake to 2L / day",
            "expected_gain": "↑ energy, ↑ focus",
            "difficulty": "low",
        })

    if not suggestions:
        suggestions.append({
            "action": "Maintain current healthy habits",
            "expected_gain": "Continued wellness maintenance",
            "difficulty": "low",
        })

    return suggestions[:3]


ancestry_engine = AncestryEngine()
