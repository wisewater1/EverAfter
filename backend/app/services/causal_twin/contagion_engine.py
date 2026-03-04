"""
Contagion Engine — Behavioral health contagion within households.

Maps the domino-effect of health degradation across consented family
members.  When one member's biometrics decline, this engine predicts
which other members are most likely to be affected and how soon,
then issues "Household Prescriptions" — system-wide family
interventions designed to break the contagion loop.

Fixes contradiction: trend direction now uses shared detect_trend()
(literal: rising/falling/stable), consistent with SharedHealthPredictor.
Household risk levels use canonical risk_level() function.

Primary consumer: St. Joseph (family-level predictions).
"""

from __future__ import annotations

import uuid
import math
from datetime import datetime
from typing import Any, Dict, List, Optional, Tuple

from app.services.health.health_constants import (
    detect_trend, risk_level, CONTAGIOUS_METRICS as _HC_CONTAGIOUS,
    Metric,
)

# ── Contagion influence weights ──────────────────────────────────
# Relationship type → relative influence strength (0–1).
# Closer relationships propagate stress/health decline faster.

RELATIONSHIP_INFLUENCE = {
    "spouse":   0.85,
    "partner":  0.85,
    "parent":   0.70,
    "child":    0.75,
    "sibling":  0.55,
    "grandparent": 0.40,
    "grandchild":  0.45,
    "uncle":    0.25,
    "aunt":     0.25,
    "cousin":   0.20,
    "other":    0.15,
}

# Metric propagation lag in days (how long before partner is affected)
PROPAGATION_LAG = {
    "spouse":   1.5,
    "partner":  1.5,
    "parent":   3.0,
    "child":    2.0,
    "sibling":  4.0,
    "grandparent": 5.0,
    "grandchild":  4.0,
    "other":    7.0,
}

# Metrics that propagate through household dynamics (from health_constants)
CONTAGIOUS_METRICS = [
    Metric.STRESS_LEVEL,           # "stress_level"
    Metric.SLEEP_DURATION,         # "sleep_duration"
    Metric.RESTING_HEART_RATE,     # "resting_heart_rate"
    Metric.HRV,                    # "heart_rate_variability"
    Metric.STEPS,                  # "steps"
    Metric.WELLNESS_COMPOSITE,     # "wellness_composite"
]

# ── Household prescriptions ──────────────────────────────────────

HOUSEHOLD_PRESCRIPTIONS = {
    "stress_cascade": {
        "title": "Family Calm-Down Hour",
        "description": (
            "Designate one hour before bedtime as a household screen-free, "
            "low-light zone. All family members participate. This breaks "
            "inter-personal stress amplification loops."
        ),
        "target_metrics": ["stress_level", "sleep_duration"],
        "frequency": "nightly",
    },
    "sleep_sync": {
        "title": "Synchronized Sleep Schedule",
        "description": (
            "Align bedtimes within a 30-minute window for cohabitating "
            "members. Mismatched sleep schedules disrupt household cortisol "
            "rhythms and propagate fatigue."
        ),
        "target_metrics": ["sleep_duration", "heart_rate_variability"],
        "frequency": "nightly",
    },
    "activity_cascade": {
        "title": "Family Movement Challenge",
        "description": (
            "Set a shared daily step goal (e.g., 7,000 steps per member). "
            "When activity levels drop for one member, the whole household "
            "tends to follow. A group target creates positive contagion."
        ),
        "target_metrics": ["steps", "resting_heart_rate"],
        "frequency": "daily",
    },
    "emotional_contagion": {
        "title": "Gratitude Round-Robin",
        "description": (
            "Each evening, every family member shares one thing they're "
            "grateful for. Positive emotional expression is as contagious "
            "as negative — use it proactively."
        ),
        "target_metrics": ["stress_level", "wellness_composite"],
        "frequency": "daily",
    },
    "immune_support": {
        "title": "Household Hygiene Protocol",
        "description": (
            "When any member's HRV drops below threshold, activate "
            "enhanced household hygiene: increased ventilation, hand-washing "
            "reminders, and immune-supporting meals for everyone."
        ),
        "target_metrics": ["heart_rate_variability"],
        "frequency": "as triggered",
    },
}


# ── Helpers ──────────────────────────────────────────────────────

def _mean(vals: List[float]) -> float:
    return sum(vals) / max(len(vals), 1)


def _metric_trend(values: List[float]) -> str:
    """Delegate to shared health_constants.detect_trend (literal direction).
    Returns: 'rising' | 'falling' | 'stable' | 'unknown'.
    ContagionEngine and SharedHealthPredictor now produce identical trend strings.
    """
    return detect_trend(values)


# ═════════════════════════════════════════════════════════════════
#  ContagionEngine
# ═════════════════════════════════════════════════════════════════

class ContagionEngine:
    """
    Detects cross-family health contagion patterns and prescribes
    household-level interventions.

    Usage:
        from app.services.causal_twin.contagion_engine import contagion_engine
        report = await contagion_engine.analyze_household(members, consent_map)
    """

    async def analyze_household(
        self,
        family_members: List[Dict[str, Any]],
        consent_map: Optional[Dict[str, bool]] = None,
    ) -> Dict[str, Any]:
        """
        Analyse a household for behavioural contagion chains.

        Each member dict should include:
            id, firstName, lastName, relationship, metrics (list of metric dicts)
        """
        consent_map = consent_map or {}
        consented = [
            m for m in family_members
            if consent_map.get(m.get("id", ""), True)
        ]

        # Build per-member metric snapshots
        member_data: List[Dict[str, Any]] = []
        for m in consented:
            mid = m.get("id", str(uuid.uuid4()))
            name = f"{m.get('firstName', '')} {m.get('lastName', '')}".strip() or mid
            metrics = m.get("metrics", [])

            # Group by metric_type → list of values
            by_metric: Dict[str, List[float]] = {}
            for mx in metrics:
                mt = mx.get("metric_type", "")
                v = mx.get("value")
                if v is not None and mt in CONTAGIOUS_METRICS:
                    by_metric.setdefault(mt, []).append(float(v))

            trends: Dict[str, str] = {}
            means: Dict[str, float] = {}
            for mt, vals in by_metric.items():
                trends[mt] = _metric_trend(vals)
                means[mt] = round(_mean(vals), 2)

            member_data.append({
                "id": mid,
                "name": name,
                "relationship": m.get("relationship", "other"),
                "trends": trends,
                "means": means,
                "metric_count": sum(len(v) for v in by_metric.values()),
            })

        # Detect contagion chains
        chains = self._detect_contagion_chains(member_data)

        # Generate household prescriptions
        prescriptions = self._generate_prescriptions(chains, member_data)

        # Household risk score
        household_risk = self._calculate_household_risk(chains, member_data)

        return {
            "report_id": str(uuid.uuid4()),
            "generated_at": datetime.utcnow().isoformat(),
            "household_members": len(consented),
            "contagion_chains": chains,
            "household_risk_score": household_risk["score"],
            "household_risk_level": household_risk["level"],
            "household_prescriptions": prescriptions,
            "member_vulnerability": self._rank_vulnerability(member_data),
            "narrative": self._build_narrative(chains, prescriptions, member_data),
        }

    async def get_contagion_report(
        self,
        family_id: str,
        family_members: List[Dict[str, Any]],
        consent_map: Optional[Dict[str, bool]] = None,
    ) -> Dict[str, Any]:
        """Public convenience endpoint."""
        result = await self.analyze_household(family_members, consent_map)
        result["family_id"] = family_id
        return result

    # ── Private helpers ──────────────────────────────────────────

    def _detect_contagion_chains(
        self, members: List[Dict[str, Any]]
    ) -> List[Dict[str, Any]]:
        """
        Identify propagation pathways: if member A's metric is declining,
        predict impact on member B based on relationship proximity.
        """
        chains: List[Dict[str, Any]] = []

        for source in members:
            declining_metrics = [
                mt for mt, trend in source["trends"].items()
                if self._is_declining(mt, trend)
            ]

            if not declining_metrics:
                continue

            for target in members:
                if target["id"] == source["id"]:
                    continue

                relationship = self._infer_relationship(source, target)
                influence = RELATIONSHIP_INFLUENCE.get(relationship, 0.15)
                lag_days = PROPAGATION_LAG.get(relationship, 7.0)

                for metric in declining_metrics:
                    propagation_prob = round(
                        influence * (1.0 - target["trends"].get(metric, "stable") == "stable") + influence * 0.5,
                        2,
                    )
                    propagation_prob = min(propagation_prob, 0.95)

                    chains.append({
                        "chain_id": str(uuid.uuid4()),
                        "source_member": source["name"],
                        "source_id": source["id"],
                        "target_member": target["name"],
                        "target_id": target["id"],
                        "metric": metric,
                        "relationship": relationship,
                        "influence_strength": influence,
                        "propagation_probability": propagation_prob,
                        "estimated_lag_days": lag_days,
                        "source_trend": source["trends"].get(metric, "unknown"),
                    })

        # Sort by propagation probability descending
        chains.sort(key=lambda c: c["propagation_probability"], reverse=True)
        return chains[:20]  # Top 20 chains

    def _is_declining(self, metric: str, trend: str) -> bool:
        """Determine if a given trend is 'bad' for the metric."""
        worse_if_rising = {"stress_level", "resting_heart_rate", "wellness_composite"}
        worse_if_falling = {"sleep_duration", "heart_rate_variability", "steps"}

        if metric in worse_if_rising and trend == "rising":
            return True
        if metric in worse_if_falling and trend == "falling":
            return True
        return False

    def _infer_relationship(
        self, source: Dict[str, Any], target: Dict[str, Any]
    ) -> str:
        """Use explicit relationship field or default to 'other'."""
        rel = target.get("relationship", "other").lower().strip()
        if rel in RELATIONSHIP_INFLUENCE:
            return rel
        return "other"

    def _generate_prescriptions(
        self,
        chains: List[Dict[str, Any]],
        members: List[Dict[str, Any]],
    ) -> List[Dict[str, Any]]:
        """Select household prescriptions based on detected contagion."""
        affected_metrics: set = set()
        for chain in chains:
            affected_metrics.add(chain["metric"])

        selected: List[Dict[str, Any]] = []
        for key, rx in HOUSEHOLD_PRESCRIPTIONS.items():
            overlap = affected_metrics & set(rx["target_metrics"])
            if overlap:
                selected.append({
                    **rx,
                    "prescription_id": str(uuid.uuid4()),
                    "triggered_by_metrics": list(overlap),
                    "affected_members": len(set(
                        c["target_id"] for c in chains if c["metric"] in overlap
                    )),
                })

        return selected

    def _calculate_household_risk(
        self,
        chains: List[Dict[str, Any]],
        members: List[Dict[str, Any]],
    ) -> Dict[str, Any]:
        """Aggregate contagion into a household risk score."""
        if not chains:
            return {"score": 15.0, "level": "low"}

        avg_prob = _mean([c["propagation_probability"] for c in chains])
        chain_density = len(chains) / max(len(members) ** 2, 1)

        score = (avg_prob * 60) + (chain_density * 40)
        score = max(0, min(100, score))
        return {"score": round(score, 1), "level": risk_level(score)}

    def _rank_vulnerability(
        self, members: List[Dict[str, Any]]
    ) -> List[Dict[str, Any]]:
        """Rank members by how vulnerable they are to contagion."""
        rankings: List[Dict[str, Any]] = []
        for m in members:
            declining = sum(
                1 for mt, t in m["trends"].items()
                if self._is_declining(mt, t)
            )
            vulnerability = round(declining / max(len(CONTAGIOUS_METRICS), 1), 2)
            rankings.append({
                "member_id": m["id"],
                "member_name": m["name"],
                "vulnerability_score": vulnerability,
                "declining_metrics": [
                    mt for mt, t in m["trends"].items()
                    if self._is_declining(mt, t)
                ],
            })
        rankings.sort(key=lambda r: r["vulnerability_score"], reverse=True)
        return rankings

    def _build_narrative(
        self,
        chains: List[Dict[str, Any]],
        prescriptions: List[Dict[str, Any]],
        members: List[Dict[str, Any]],
    ) -> str:
        if not chains:
            return (
                "No behavioural contagion patterns detected in your household. "
                "Everyone's metrics are stable — great teamwork!"
            )

        top = chains[0]
        parts = [
            f"Contagion alert: {top['source_member']}'s {top['metric'].replace('_', ' ')} "
            f"is {top['source_trend']}, with a {top['propagation_probability']:.0%} chance "
            f"of affecting {top['target_member']} within ~{top['estimated_lag_days']:.0f} days."
        ]

        if len(chains) > 1:
            parts.append(
                f"We detected {len(chains)} total propagation pathways across your household."
            )

        if prescriptions:
            parts.append(
                f"Recommended household prescription: '{prescriptions[0]['title']}'."
            )

        return " ".join(parts)




    # -- Trinity Synapse bridge --------------------------------------------------

    def analyze_family(self, members, relationship_graph=None, consent_map=None):
        """Synchronous bridge for TrinitySynapse.contagion_graph()."""
        import asyncio

        if relationship_graph:
            weight_map = {}
            for edge in relationship_graph:
                w = float(edge.get("weight", 0.3))
                for mid in (edge.get("from"), edge.get("to")):
                    if mid:
                        weight_map[mid] = max(weight_map.get(mid, 0.0), w)
            for m in members:
                m["_relationship_weight"] = weight_map.get(m.get("id", ""), 0.3)

        try:
            loop = asyncio.get_event_loop()
            if loop.is_running():
                import concurrent.futures
                with concurrent.futures.ThreadPoolExecutor() as pool:
                    future = pool.submit(
                        asyncio.run, self.analyze_household(members, consent_map)
                    )
                    return future.result(timeout=10)
            else:
                return loop.run_until_complete(
                    self.analyze_household(members, consent_map)
                )
        except Exception as exc:
            return {
                "error": str(exc),
                "contagion_hotspots": [],
                "contagion_chains": [],
                "household_prescriptions": [],
                "household_risk_level": "unknown",
                "narrative": "ContagionEngine unavailable.",
            }


# ── Singleton ────────────────────────────────────────────────────

contagion_engine = ContagionEngine()
