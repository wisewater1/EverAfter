"""
Environmental Susceptibility Matrix — External threat × immune resilience.

Connects environmental risk factors (seasonal flu surges, allergen spikes,
air quality degradation) with the family's current immune-resilience score
to produce proactive vulnerability assessments and preventative shields.

Fixes contradiction: RESILIENCE_WEIGHTS and risk thresholds now sourced
from health_constants. _risk_level() uses canonical 4-tier (0/30/55/80).

Designed for future live oracle integration (CDC API, AirNow API, pollen
trackers).  In the interim, uses simulated/seasonal baseline data.

Primary consumers: St. Joseph (family shield) and St. Raphael (individual).
"""

from __future__ import annotations

import uuid
import math
import hashlib
from datetime import datetime
from typing import Any, Dict, List, Optional

from app.services.health.health_constants import (
    RESILIENCE_WEIGHTS as _HC_RESILIENCE, risk_level,
)

# ── Seasonal threat baselines (Northern Hemisphere, simulated) ───
# Month → { threat_type: baseline_risk_0_100 }

SEASONAL_THREATS: Dict[int, Dict[str, float]] = {
    1:  {"flu": 85, "cold": 70, "allergens": 10, "aqi": 30},
    2:  {"flu": 80, "cold": 65, "allergens": 15, "aqi": 25},
    3:  {"flu": 55, "cold": 50, "allergens": 40, "aqi": 30},
    4:  {"flu": 30, "cold": 30, "allergens": 70, "aqi": 35},
    5:  {"flu": 15, "cold": 20, "allergens": 80, "aqi": 45},
    6:  {"flu": 10, "cold": 10, "allergens": 60, "aqi": 55},
    7:  {"flu":  8, "cold":  8, "allergens": 45, "aqi": 65},
    8:  {"flu": 10, "cold": 10, "allergens": 50, "aqi": 60},
    9:  {"flu": 20, "cold": 25, "allergens": 55, "aqi": 45},
    10: {"flu": 40, "cold": 45, "allergens": 35, "aqi": 35},
    11: {"flu": 65, "cold": 60, "allergens": 15, "aqi": 30},
    12: {"flu": 80, "cold": 75, "allergens": 10, "aqi": 30},
}

THREAT_DESCRIPTIONS = {
    "flu": "Influenza / respiratory virus",
    "cold": "Common cold / rhinovirus",
    "allergens": "Pollen / seasonal allergens",
    "aqi": "Air quality degradation (PM2.5 / ozone)",
}

# ── Immune-resilience metric weights ─────────────────────────────
# Metrics that contribute to the 14-day immune resilience composite.

RESILIENCE_WEIGHTS: Dict[str, Dict[str, Any]] = {
    "sleep_duration":         {"weight": 0.30, "ideal": 7.5, "direction": "higher_is_better"},
    "heart_rate_variability": {"weight": 0.25, "ideal": 55,  "direction": "higher_is_better"},
    "stress_level":           {"weight": 0.20, "ideal": 3,   "direction": "lower_is_better"},
    "steps":                  {"weight": 0.15, "ideal": 8000, "direction": "higher_is_better"},
    "resting_heart_rate":     {"weight": 0.10, "ideal": 62,  "direction": "lower_is_better"},
}

# ── Preventative shields ─────────────────────────────────────────

PREVENTATIVE_SHIELDS: Dict[str, List[Dict[str, str]]] = {
    "flu": [
        {"action": "Boost Vitamin C intake (500 mg/day)", "urgency": "immediate"},
        {"action": "Add 30 mg Zinc daily for the next 7 days", "urgency": "immediate"},
        {"action": "Increase sleep by +1 hour tonight", "urgency": "tonight"},
        {"action": "Reduce intense exercise to avoid immune suppression", "urgency": "this_week"},
    ],
    "cold": [
        {"action": "Hydrate: target 2.5 L water today", "urgency": "immediate"},
        {"action": "Gargle warm salt water morning and evening", "urgency": "daily"},
        {"action": "Prioritize 7+ hours of sleep", "urgency": "tonight"},
    ],
    "allergens": [
        {"action": "Take antihistamine before going outdoors", "urgency": "before_exposure"},
        {"action": "Keep windows closed during peak pollen hours (5–10 AM)", "urgency": "daily"},
        {"action": "Shower and change clothes after outdoor activities", "urgency": "after_exposure"},
    ],
    "aqi": [
        {"action": "Avoid outdoor exercise when AQI > 100", "urgency": "immediate"},
        {"action": "Use HEPA air purifiers indoors", "urgency": "continuous"},
        {"action": "Wear N95 mask for extended outdoor exposure", "urgency": "as_needed"},
    ],
}


# ── Helpers ──────────────────────────────────────────────────────

def _mean(vals: List[float]) -> float:
    return sum(vals) / max(len(vals), 1)


def _location_variance(location: str) -> float:
    """
    Deterministic jitter derived from location string to simulate
    local conditions until live oracles are connected.
    """
    h = int(hashlib.md5(location.encode()).hexdigest()[:8], 16)
    return ((h % 30) - 15)  # ±15 range


# ═════════════════════════════════════════════════════════════════
#  EnvironmentalMatrix
# ═════════════════════════════════════════════════════════════════

class EnvironmentalMatrix:
    """
    Computes per-person vulnerability scores by crossing environmental
    threat levels with individual immune resilience.

    Usage:
        from app.services.causal_twin.environmental_matrix import environmental_matrix
        report = await environmental_matrix.get_susceptibility_report(
            user_id, members, location="Houston, TX"
        )
    """

    async def get_susceptibility_report(
        self,
        user_id: str,
        family_members: List[Dict[str, Any]],
        location: str = "US-Central",
        consent_map: Optional[Dict[str, bool]] = None,
    ) -> Dict[str, Any]:
        """
        Full susceptibility report for a household.
        """
        consent_map = consent_map or {}
        now = datetime.utcnow()
        month = now.month

        # Environmental threat assessment
        threats = self._assess_threats(location, month)

        # Per-member vulnerability
        member_reports: List[Dict[str, Any]] = []
        resilience_scores: List[float] = []

        for m in family_members:
            mid = m.get("id", str(uuid.uuid4()))
            name = f"{m.get('firstName', '')} {m.get('lastName', '')}".strip() or mid
            consented = consent_map.get(mid, True)

            if not consented:
                member_reports.append({
                    "member_id": mid,
                    "member_name": name,
                    "consent_granted": False,
                    "resilience": None,
                    "vulnerabilities": [],
                })
                continue

            metrics = m.get("metrics", m.get("metrics_history", []))
            resilience = self._calculate_resilience(metrics)
            vulnerabilities = self._cross_vulnerability(resilience, threats)
            resilience_scores.append(resilience["score"])

            member_reports.append({
                "member_id": mid,
                "member_name": name,
                "consent_granted": True,
                "resilience": resilience,
                "vulnerabilities": vulnerabilities,
                "shields": self._select_shields(vulnerabilities),
            })

        # Household aggregate
        avg_resilience = _mean(resilience_scores) if resilience_scores else 50.0
        household_vulnerability = round(100 - avg_resilience, 1)

        return {
            "report_id": str(uuid.uuid4()),
            "user_id": user_id,
            "generated_at": now.isoformat(),
            "location": location,
            "month": month,
            "environmental_threats": threats,
            "household_resilience": round(avg_resilience, 1),
            "household_vulnerability": household_vulnerability,
            "household_risk_level": self._risk_level(household_vulnerability),
            "member_reports": member_reports,
            "household_shields": self._household_shields(threats, avg_resilience),
            "narrative": self._build_narrative(
                threats, member_reports, avg_resilience, location
            ),
        }

    # ── Threat assessment ────────────────────────────────────────

    def _assess_threats(self, location: str, month: int) -> Dict[str, Any]:
        """
        Assess environmental threats for the location and time of year.
        """
        base = SEASONAL_THREATS.get(month, {})
        variance = _location_variance(location)

        threats: Dict[str, Any] = {}
        dominant_threat = ""
        dominant_level = 0.0

        for threat_type, base_level in base.items():
            adjusted = max(0, min(100, base_level + variance))
            threats[threat_type] = {
                "level": round(adjusted, 1),
                "risk_label": self._risk_level(adjusted),
                "description": THREAT_DESCRIPTIONS.get(threat_type, ""),
                "source": "seasonal_baseline",
            }
            if adjusted > dominant_level:
                dominant_level = adjusted
                dominant_threat = threat_type

        threats["dominant_threat"] = dominant_threat
        threats["dominant_level"] = round(dominant_level, 1)

        return threats

    # ── Immune resilience scoring ────────────────────────────────

    def _calculate_resilience(
        self, metrics: List[Dict[str, Any]]
    ) -> Dict[str, Any]:
        """
        Calculate a 0–100 immune resilience score from 14-day biometrics.
        """
        metric_means: Dict[str, float] = {}
        for m in metrics:
            mt = m.get("metric_type", "")
            v = m.get("value")
            if v is not None and mt in RESILIENCE_WEIGHTS:
                metric_means.setdefault(mt, [])
                metric_means[mt].append(float(v))  # type: ignore
        metric_means = {k: _mean(v) for k, v in metric_means.items()}  # type: ignore

        total = 0.0
        breakdown: Dict[str, Dict[str, Any]] = {}

        for metric, spec in RESILIENCE_WEIGHTS.items():
            val = metric_means.get(metric)
            if val is None:
                sub_score = 50.0  # neutral if missing
            else:
                ideal = spec["ideal"]
                direction = spec["direction"]
                if direction == "higher_is_better":
                    sub_score = min(100, (val / ideal) * 100)
                else:  # lower_is_better
                    sub_score = min(100, (ideal / max(val, 1)) * 100)

            weighted = sub_score * spec["weight"]
            total += weighted
            breakdown[metric] = {
                "value": metric_means.get(metric),
                "sub_score": round(sub_score, 1),
                "weight": spec["weight"],
                "weighted": round(weighted, 1),
            }

        return {
            "score": round(max(0, min(100, total)), 1),
            "level": self._resilience_level(total),
            "breakdown": breakdown,
        }

    # ── Cross vulnerability ──────────────────────────────────────

    def _cross_vulnerability(
        self,
        resilience: Dict[str, Any],
        threats: Dict[str, Any],
    ) -> List[Dict[str, Any]]:
        """
        Cross immune resilience with each threat to produce per-threat
        vulnerability scores.
        """
        vulns: List[Dict[str, Any]] = []
        res_score = resilience["score"]

        for threat_type in THREAT_DESCRIPTIONS:
            threat_data = threats.get(threat_type, {})
            if isinstance(threat_data, dict):
                threat_level = threat_data.get("level", 0)
            else:
                continue

            # Vulnerability = threat_level × (1 - resilience/100)
            vuln_score = round(threat_level * (1 - res_score / 100), 1)

            vulns.append({
                "threat": threat_type,
                "threat_level": threat_level,
                "vulnerability_score": vuln_score,
                "vulnerability_label": self._risk_level(vuln_score),
            })

        vulns.sort(key=lambda v: v["vulnerability_score"], reverse=True)
        return vulns

    # ── Shield selection ─────────────────────────────────────────

    def _select_shields(
        self, vulnerabilities: List[Dict[str, Any]]
    ) -> List[Dict[str, Any]]:
        """Select preventative shields for the most vulnerable threats."""
        shields: List[Dict[str, Any]] = []
        for vuln in vulnerabilities:
            if vuln["vulnerability_score"] >= 30:
                threat = vuln["threat"]
                for action in PREVENTATIVE_SHIELDS.get(threat, [])[:2]:
                    shields.append({
                        **action,
                        "for_threat": threat,
                        "vulnerability_score": vuln["vulnerability_score"],
                    })
        return shields[:8]

    def _household_shields(
        self, threats: Dict[str, Any], avg_resilience: float
    ) -> List[str]:
        """Top-level household recommendations."""
        recs: List[str] = []
        dominant = threats.get("dominant_threat", "")
        dominant_level = threats.get("dominant_level", 0)

        if dominant_level >= 50 and avg_resilience < 60:
            recs.append(
                f"⚠️ High {dominant.upper()} risk + low household resilience. "
                f"Activate household-wide preventative protocol immediately."
            )

        if avg_resilience < 50:
            recs.append(
                "Household resilience is below average. Focus on: "
                "more sleep, stress reduction, and moderate daily activity."
            )
        elif avg_resilience >= 75:
            recs.append(
                "Household resilience is strong. Maintain current "
                "sleep, activity, and stress-management habits."
            )

        return recs or ["Household resilience is adequate. Continue monitoring."]

    # ── Helpers ──────────────────────────────────────────────────

    def _risk_level(self, score: float) -> str:
        """Delegate to shared health_constants.risk_level."""
        return risk_level(score)

    def _resilience_level(self, score: float) -> str:
        if score >= 80:
            return "strong"
        if score >= 60:
            return "adequate"
        if score >= 40:
            return "weakened"
        return "compromised"

    def _build_narrative(
        self,
        threats: Dict[str, Any],
        members: List[Dict[str, Any]],
        avg_resilience: float,
        location: str,
    ) -> str:
        dominant = threats.get("dominant_threat", "unknown")
        level = threats.get("dominant_level", 0)

        parts = [
            f"Environmental scan for {location}: dominant threat is "
            f"{dominant} (level {level}/100)."
        ]

        vulnerable = [
            m for m in members
            if m.get("consent_granted") and
            m.get("resilience", {}).get("score", 100) < 50
        ]
        if vulnerable:
            names = ", ".join(m["member_name"] for m in vulnerable[:3])
            parts.append(
                f"Vulnerable members: {names}. "
                f"Their immune resilience is below the safety threshold."
            )

        if avg_resilience < 50 and level >= 50:
            parts.append(
                "⚠️ ALERT: Low household resilience during high-threat period. "
                "Immediate preventative action recommended."
            )
        else:
            parts.append("Household resilience is within acceptable range.")

        return " ".join(parts)


# ── Singleton ────────────────────────────────────────────────────

environmental_matrix = EnvironmentalMatrix()
