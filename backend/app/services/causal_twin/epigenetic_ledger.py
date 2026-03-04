"""
Epigenetic Ledger — Multi-generational health pattern matching.

Compares a family member's current health trajectory against verified
health data from their parents/grandparents *at the same age*, surfacing
leading indicators of familial conditions before clinical onset.

Fixes contradiction: age default now 35 (from health_constants), consistent
with AncestryEngine. Risk level uses canonical risk_level() function.

Primary consumer: St. Joseph (family tree predictions).
Extends the AncestryEngine with age-matched comparison logic.
"""

from __future__ import annotations

import uuid
import math
from datetime import datetime
from typing import Any, Dict, List, Optional, Tuple

from app.services.health.health_constants import age_from_birth_year, risk_level

# ── Known hereditary risk patterns ───────────────────────────────
# condition → (precursor metrics, typical age-of-onset range, risk weight)

HEREDITARY_PATTERNS = {
    "type_2_diabetes": {
        "precursors": ["glucose", "weight", "steps"],
        "onset_range": (35, 65),
        "risk_weight": 0.8,
        "description": "Type 2 Diabetes – watch glucose, weight, and activity levels",
    },
    "hypertension": {
        "precursors": ["resting_heart_rate", "heart_rate", "stress_level"],
        "onset_range": (30, 60),
        "risk_weight": 0.75,
        "description": "Hypertension – watch resting HR, stress markers",
    },
    "cardiovascular_disease": {
        "precursors": ["heart_rate_variability", "resting_heart_rate", "steps"],
        "onset_range": (40, 70),
        "risk_weight": 0.85,
        "description": "Cardiovascular disease – watch HRV, resting HR, activity",
    },
    "metabolic_syndrome": {
        "precursors": ["glucose", "weight", "sleep_duration"],
        "onset_range": (30, 55),
        "risk_weight": 0.7,
        "description": "Metabolic syndrome – watch glucose, weight, and sleep",
    },
    "anxiety_depression": {
        "precursors": ["stress_level", "sleep_duration", "heart_rate_variability"],
        "onset_range": (20, 50),
        "risk_weight": 0.6,
        "description": "Anxiety / Depression – watch stress, sleep quality, HRV",
    },
    "osteoporosis": {
        "precursors": ["steps", "weight"],
        "onset_range": (50, 75),
        "risk_weight": 0.5,
        "description": "Osteoporosis – watch activity levels and weight stability",
    },
}


# ── Helpers ──────────────────────────────────────────────────────

def _mean(vals: List[float]) -> float:
    return sum(vals) / max(len(vals), 1)


def _age_from_birth_year(birth_year: Optional[int]) -> int:
    """Delegate to shared health_constants (default = 35, not 40)."""
    return age_from_birth_year(birth_year)


# ═════════════════════════════════════════════════════════════════
#  EpigeneticLedger
# ═════════════════════════════════════════════════════════════════

class EpigeneticLedger:
    """
    Multi-generational health comparison and leading-indicator detection.

    Usage:
        from app.services.causal_twin.epigenetic_ledger import epigenetic_ledger
        result = await epigenetic_ledger.get_epigenetic_risk(member_id, member, ancestors)
    """

    async def get_epigenetic_risk(
        self,
        member_id: str,
        member: Dict[str, Any],
        ancestors: List[Dict[str, Any]],
    ) -> Dict[str, Any]:
        """
        Full epigenetic risk report for a single family member.

        Args:
            member: dict with id, firstName, lastName, birthYear, metrics, traits
            ancestors: list of dicts representing parents/grandparents,
                       each with birthYear, health_events (list of {condition, onset_age}),
                       metrics_at_age (dict of age → list of metric dicts), traits
        """
        member_age = _age_from_birth_year(member.get("birthYear") or member.get("birth_year"))
        member_name = f"{member.get('firstName', '')} {member.get('lastName', '')}".strip()

        # Age-matched comparisons
        age_comparisons = self._compare_at_age(member, member_age, ancestors)

        # Leading indicators from ancestor health events
        leading_indicators = self._detect_leading_indicators(member, member_age, ancestors)

        # Hereditary risk scoring
        hereditary_risks = self._score_hereditary_risks(member, member_age, ancestors)

        # Aggregate risk
        risk_scores = [r["risk_score"] for r in hereditary_risks if r["risk_score"] > 0]
        aggregate_score = _mean(risk_scores) if risk_scores else 15.0
        aggregate_score = max(0, min(100, aggregate_score))
        return {
            "report_id": str(uuid.uuid4()),
            "member_id": member_id,
            "member_name": member_name,
            "member_age": member_age,
            "generated_at": datetime.utcnow().isoformat(),
            "aggregate_risk_score": round(aggregate_score, 1),
            "aggregate_risk_level": risk_level(aggregate_score),
            "age_comparisons": age_comparisons,
            "leading_indicators": leading_indicators,
            "hereditary_risks": hereditary_risks,
            "recommendations": self._generate_recommendations(
                hereditary_risks, leading_indicators, member_age
            ),
            "narrative": self._build_narrative(
                member_name, member_age, age_comparisons,
                leading_indicators, hereditary_risks
            ),
        }

    # ── Core logic ───────────────────────────────────────────────

    def _compare_at_age(
        self,
        member: Dict[str, Any],
        member_age: int,
        ancestors: List[Dict[str, Any]],
    ) -> List[Dict[str, Any]]:
        """
        Compare the member's current metrics against each ancestor's
        metrics at the same age (or closest available age).
        """
        comparisons: List[Dict[str, Any]] = []

        member_metrics = member.get("metrics", [])
        member_means: Dict[str, float] = {}
        for m in member_metrics:
            mt = m.get("metric_type", "")
            v = m.get("value")
            if v is not None:
                member_means.setdefault(mt, [])
                member_means[mt].append(float(v))  # type: ignore
        # Flatten to means
        member_means = {k: _mean(v) for k, v in member_means.items()}  # type: ignore

        for ancestor in ancestors:
            anc_name = f"{ancestor.get('firstName', '')} {ancestor.get('lastName', '')}".strip()
            anc_relation = ancestor.get("relationship", "ancestor")
            metrics_at_age = ancestor.get("metrics_at_age", {})

            # Find closest age key
            best_age = self._closest_age(member_age, list(metrics_at_age.keys()))
            if best_age is None:
                # Synthesize from traits if no age-keyed data
                anc_metrics = self._synthesize_ancestor_metrics(ancestor, member_age)
            else:
                anc_metrics = metrics_at_age[best_age]

            # Build comparison
            anc_means: Dict[str, float] = {}
            for m in (anc_metrics if isinstance(anc_metrics, list) else []):
                mt = m.get("metric_type", "")
                v = m.get("value")
                if v is not None:
                    anc_means.setdefault(mt, [])
                    anc_means[mt].append(float(v))  # type: ignore
            anc_means = {k: _mean(v) for k, v in anc_means.items()}  # type: ignore

            divergences: List[Dict[str, Any]] = []
            for metric in set(member_means.keys()) | set(anc_means.keys()):
                m_val = member_means.get(metric)
                a_val = anc_means.get(metric)
                if m_val is not None and a_val is not None:
                    diff = round(m_val - a_val, 2)
                    pct = round(diff / max(abs(a_val), 1) * 100, 1)
                    divergences.append({
                        "metric": metric,
                        "member_value": round(m_val, 2),
                        "ancestor_value": round(a_val, 2),
                        "difference": diff,
                        "difference_pct": pct,
                        "direction": "worse" if abs(pct) > 15 and diff > 0 else "better" if diff < -5 else "similar",
                    })

            comparisons.append({
                "ancestor_name": anc_name,
                "ancestor_relationship": anc_relation,
                "comparison_age": best_age or member_age,
                "divergences": divergences,
            })

        return comparisons

    def _detect_leading_indicators(
        self,
        member: Dict[str, Any],
        member_age: int,
        ancestors: List[Dict[str, Any]],
    ) -> List[Dict[str, Any]]:
        """
        For each ancestor with a known health event, check if the member
        is showing the same precursor patterns at an earlier age.
        """
        indicators: List[Dict[str, Any]] = []

        for ancestor in ancestors:
            anc_name = f"{ancestor.get('firstName', '')} {ancestor.get('lastName', '')}".strip()
            health_events = ancestor.get("health_events", [])

            for event in health_events:
                condition = event.get("condition", "")
                onset_age = event.get("onset_age")
                if not onset_age or member_age >= onset_age:
                    continue  # Already past onset — not a leading indicator

                # Check pattern definitions
                pattern = HEREDITARY_PATTERNS.get(condition)
                if not pattern:
                    continue

                years_until_onset = onset_age - member_age
                precursor_match = self._check_precursors(
                    member.get("metrics", []),
                    pattern["precursors"],
                )

                if precursor_match["matching_precursors"]:
                    urgency = "high" if years_until_onset <= 5 else "moderate" if years_until_onset <= 10 else "low"
                    indicators.append({
                        "indicator_id": str(uuid.uuid4()),
                        "condition": condition,
                        "description": pattern["description"],
                        "ancestor_name": anc_name,
                        "ancestor_onset_age": onset_age,
                        "member_current_age": member_age,
                        "years_until_ancestor_onset": years_until_onset,
                        "matching_precursors": precursor_match["matching_precursors"],
                        "precursor_confidence": precursor_match["confidence"],
                        "urgency": urgency,
                    })

        indicators.sort(key=lambda i: i["years_until_ancestor_onset"])
        return indicators

    def _score_hereditary_risks(
        self,
        member: Dict[str, Any],
        member_age: int,
        ancestors: List[Dict[str, Any]],
    ) -> List[Dict[str, Any]]:
        """Score each hereditary pattern based on ancestor prevalence."""
        condition_counts: Dict[str, int] = {}
        for ancestor in ancestors:
            for event in ancestor.get("health_events", []):
                cond = event.get("condition", "")
                condition_counts[cond] = condition_counts.get(cond, 0) + 1

        risks: List[Dict[str, Any]] = []
        for condition, pattern in HEREDITARY_PATTERNS.items():
            family_prevalence = condition_counts.get(condition, 0)
            in_age_window = pattern["onset_range"][0] <= member_age <= pattern["onset_range"][1]

            base = family_prevalence * 20 * pattern["risk_weight"]
            age_multiplier = 1.3 if in_age_window else 0.7
            score = min(100, base * age_multiplier)

            risks.append({
                "condition": condition,
                "description": pattern["description"],
                "family_prevalence": family_prevalence,
                "in_onset_window": in_age_window,
                "risk_score": round(score, 1),
                "risk_level": (
                    "high" if score >= 50 else
                    "moderate" if score >= 25 else "low"
                ),
            })

        risks.sort(key=lambda r: r["risk_score"], reverse=True)
        return risks

    # ── Helper methods ───────────────────────────────────────────

    def _closest_age(self, target: int, ages: List) -> Optional[int]:
        if not ages:
            return None
        int_ages = []
        for a in ages:
            try:
                int_ages.append(int(a))
            except (ValueError, TypeError):
                pass
        if not int_ages:
            return None
        return min(int_ages, key=lambda a: abs(a - target))

    def _synthesize_ancestor_metrics(
        self, ancestor: Dict[str, Any], age: int
    ) -> List[Dict[str, Any]]:
        """Synthesize rough metrics from ancestor traits when no age-keyed data exists."""
        traits = ancestor.get("traits", [])
        base = 50
        for t in (traits if isinstance(traits, list) else []):
            tl = str(t).lower()
            if any(kw in tl for kw in ["active", "healthy", "athletic"]):
                base -= 5
            elif any(kw in tl for kw in ["sedentary", "stressed", "anxious"]):
                base += 8
        return [{"metric_type": "wellness_composite", "value": base}]

    def _check_precursors(
        self,
        metrics: List[Dict[str, Any]],
        precursor_metrics: List[str],
    ) -> Dict[str, Any]:
        available_types = set(m.get("metric_type", "") for m in metrics)
        matching = [p for p in precursor_metrics if p in available_types]
        confidence = round(len(matching) / max(len(precursor_metrics), 1), 2)
        return {"matching_precursors": matching, "confidence": confidence}

    def _generate_recommendations(
        self,
        risks: List[Dict[str, Any]],
        indicators: List[Dict[str, Any]],
        age: int,
    ) -> List[str]:
        recs: List[str] = []
        for risk in risks[:3]:
            if risk["risk_score"] >= 25:
                recs.append(
                    f"Family history of {risk['condition'].replace('_', ' ')} detected. "
                    f"Schedule screening with your healthcare provider."
                )
        for ind in indicators[:2]:
            if ind["urgency"] in ("high", "moderate"):
                recs.append(
                    f"Leading indicator: your {', '.join(ind['matching_precursors'])} "
                    f"mirror patterns seen in {ind['ancestor_name']} before "
                    f"{ind['condition'].replace('_', ' ')} onset at age {ind['ancestor_onset_age']}. "
                    f"You have ~{ind['years_until_ancestor_onset']} years of preventative window."
                )
        if not recs:
            recs.append("No urgent hereditary risk patterns detected. Continue monitoring.")
        return recs[:5]

    def _build_narrative(
        self,
        name: str,
        age: int,
        comparisons: List[Dict[str, Any]],
        indicators: List[Dict[str, Any]],
        risks: List[Dict[str, Any]],
    ) -> str:
        parts = [f"Epigenetic report for {name} (age {age})."]
        high_risks = [r for r in risks if r["risk_score"] >= 25]
        if high_risks:
            top = high_risks[0]
            parts.append(
                f"Highest familial risk: {top['condition'].replace('_', ' ')} "
                f"(score: {top['risk_score']}, {top['family_prevalence']} ancestor(s) affected)."
            )
        if indicators:
            top = indicators[0]
            parts.append(
                f"Leading indicator alert: precursor patterns for "
                f"{top['condition'].replace('_', ' ')} detected — "
                f"{top['years_until_ancestor_onset']} years before ancestor onset."
            )
        if not high_risks and not indicators:
            parts.append("No significant hereditary risk patterns found.")
        return " ".join(parts)


# ── Singleton ────────────────────────────────────────────────────

epigenetic_ledger = EpigeneticLedger()
