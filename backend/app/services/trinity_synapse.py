"""
Trinity Synapse — Cross-Saint Data Broker
==========================================
Interlaces St. Joseph (genealogy), St. Raphael (health prediction),
and St. Gabriel (finance) through 6 coordinated analysis methods.

Data flows:
  Joseph  → EpigeneticLedger hereditary patterns → seed BackgroundSimulator priors
  Raphael → SharedHealthPredictor live risk scores → enrich FamilyTree heatmap
  Joseph  → OCEAN personality profiles → tailor BehavioralForecaster interventions
  All 3   → Generational timeline aggregation
  Joseph  → Relationship graph → ContagionEngine household detection
  Gabriel → Spending envelopes → biometric correlation (health investment ROI)
"""

from __future__ import annotations

import uuid
from datetime import datetime, date
from typing import Any, Dict, List, Optional, Tuple

from app.services.health.health_constants import (
    Metric, METRIC_THRESHOLDS, risk_level, detect_trend,
    is_trend_worsening, age_from_birth_year, wellness_to_risk,
)
from app.services.causal_twin.epigenetic_ledger import EpigeneticLedger, HEREDITARY_PATTERNS
from app.services.causal_twin.ancestry_engine import AncestryEngine
from app.services.causal_twin.contagion_engine import ContagionEngine
from app.services.causal_twin.behavioral_forecaster import BehavioralForecaster
from app.services.shared_health_predictor import SharedHealthPredictor


# ── Singleton instances ────────────────────────────────────────────────────────

_epigenetic = EpigeneticLedger()
_ancestry = AncestryEngine()
_contagion = ContagionEngine()
_forecaster = BehavioralForecaster()
_predictor = SharedHealthPredictor()


# ─────────────────────────────────────────────────────────────────────────────
# 1. ANCESTRY PRIORS (Joseph → Raphael)
#    Pull hereditary risk from EpigeneticLedger → return prior probability dict
#    for BackgroundSimulator to bias its Monte Carlo initial conditions.
# ─────────────────────────────────────────────────────────────────────────────

async def ancestry_priors(
    member_id: str,
    birth_year: Optional[int],
    metrics_history: List[Dict[str, Any]],
    family_members: List[Dict[str, Any]],
) -> Dict[str, Any]:
    """
    Compute ancestry-informed prior probabilities for health metrics.
    Returns a dict that BackgroundSimulator.set_ancestry_priors() consumes.
    """
    age = age_from_birth_year(birth_year)
    # get_epigenetic_risk is async with signature (member_id, member, ancestors).
    epigenetic_report = await _epigenetic.get_epigenetic_risk(
        member_id=member_id,
        member={
            "id": member_id,
            "birth_year": birth_year,
            "birthYear": birth_year,
            "metrics": metrics_history,
            "traits": [],
        },
        ancestors=family_members,
    )

    # Build metric-level priors from hereditary condition patterns
    priors: Dict[str, float] = {}
    active_conditions: List[Dict[str, Any]] = []

    for condition_name, pattern in HEREDITARY_PATTERNS.items():
        onset_min, onset_max = pattern["onset_range"]
        if not (onset_min <= age <= onset_max + 10):
            continue  # Outside risk window

        # Check if condition appears in family data
        family_hit = any(
            condition_name.replace("_", " ") in str(m.get("conditions", "")).lower()
            or condition_name.replace("_", " ") in str(m.get("known_conditions", "")).lower()
            for m in family_members
            if m.get("id") != member_id
        )
        if not family_hit:
            continue

        risk_weight = pattern["risk_weight"]
        active_conditions.append({
            "condition": condition_name,
            "description": pattern["description"],
            "risk_weight": risk_weight,
            "age_in_window": True,
        })

        # Translate condition risk to metric-level priors
        for metric_key in pattern["precursors"]:
            # Raise prior probability for this metric by the condition's risk weight
            priors[metric_key] = max(priors.get(metric_key, 0.0), risk_weight)

    ancestry_risk_score = min(100.0, sum(c["risk_weight"] for c in active_conditions) * 30)

    return {
        "member_id": member_id,
        "age": age,
        "metric_priors": priors,          # {metric_key: 0..1 prior risk}
        "active_hereditary_conditions": active_conditions,
        "ancestry_risk_score": round(ancestry_risk_score, 1),
        "ancestry_risk_level": risk_level(ancestry_risk_score),
        "generated_at": datetime.utcnow().isoformat(),
    }


# ─────────────────────────────────────────────────────────────────────────────
# 2. LIVE FAMILY HEATMAP (Raphael → Joseph)
#    Run SharedHealthPredictor on each family member, enrich with trend arrows
#    and Gabriel's health-spend ratio. Joseph's FamilyHealthHeatmap consumes this.
# ─────────────────────────────────────────────────────────────────────────────

async def live_family_heatmap(
    members: List[Dict[str, Any]],
    budget_envelopes: Optional[List[Dict[str, Any]]] = None,
) -> Dict[str, Any]:
    """
    Produce an enriched family health map with live risk scores, trend arrows,
    and (optionally) a health-spend indicator from Gabriel's budget envelopes.
    """
    # Derive health-spend amount from Gabriel budget if available
    health_budget_total = 0.0
    health_categories = {"gym", "fitness", "health", "medical", "pharmacy",
                          "supplements", "therapy", "dental", "vision", "wellness"}
    if budget_envelopes:
        for env in budget_envelopes:
            cat = str(env.get("category_name", "")).lower()
            if any(kw in cat for kw in health_categories):
                health_budget_total += float(env.get("assigned", 0))

    family_map = []
    for member in members:
        member_id = member.get("id", str(uuid.uuid4()))
        name = f"{member.get('firstName', '')} {member.get('lastName', '')}".strip()
        metrics = member.get("metrics_history", [])
        birth_year = member.get("birthYear")
        age = age_from_birth_year(birth_year)

        # Get live prediction from shared predictor
        try:
            pred = await _predictor.predict_user(
                user_id=member_id,
                metrics_history=metrics,
                profile={"age": age, "traits": member.get("traits", [])},
            )
            raw_score = pred.get("predicted_value", pred.get("aggregate_score", 50.0))
            trend = pred.get("trend", "stable")
            risk_factors = pred.get("risk_factors", [])
        except Exception:
            raw_score = 50.0
            trend = "stable"
            risk_factors = []

        wellness = max(0.0, 100.0 - raw_score)
        risk_lv = risk_level(raw_score)

        # Trend arrow: canonical directions from health_constants
        metric_values = [float(m.get("value", 0)) for m in metrics[-10:]] if metrics else []
        canonical_trend = detect_trend(metric_values) if metric_values else trend

        # Gabriel health-spend ratio (per member, pro-rata)
        health_spend_share = (
            round(health_budget_total / max(len(members), 1), 2)
            if health_budget_total > 0 else None
        )

        risk_colors = {
            "low": "#10b981",
            "moderate": "#f59e0b",
            "high": "#ef4444",
            "critical": "#dc2626",
        }

        family_map.append({
            "member_id": member_id,
            "member_name": name,
            "wellness_score": round(wellness, 1),
            "risk_level": risk_lv,
            "risk_score": round(raw_score, 1),
            "colour": risk_colors.get(risk_lv, "#f59e0b"),
            "trend": canonical_trend,
            "trend_arrow": {"rising": "↑", "falling": "↓", "stable": "→", "unknown": "·"}.get(
                canonical_trend, "·"
            ),
            "trend_worsening": is_trend_worsening(Metric.RESTING_HEART_RATE, canonical_trend),
            "top_risk": risk_factors[:2],
            "health_spend_monthly": health_spend_share,
            "age": age,
        })

    family_avg = (
        sum(m["wellness_score"] for m in family_map) / max(len(family_map), 1)
        if family_map else 50.0
    )

    return {
        "family_map": family_map,
        "family_avg_wellness": round(family_avg, 1),
        "family_risk_level": risk_level(wellness_to_risk(family_avg)),
        "health_budget_monthly": round(health_budget_total, 2),
        "generated_at": datetime.utcnow().isoformat(),
    }


# ─────────────────────────────────────────────────────────────────────────────
# 3. PERSONALITY INTERVENTIONS (Joseph → Raphael)
#    OCEAN profile → BehavioralForecaster recommendation ordering
# ─────────────────────────────────────────────────────────────────────────────

_OCEAN_INTERVENTION_MAP: Dict[str, Dict[str, Any]] = {
    # High Neuroticism → mindfulness/breathing first, gym last
    "high_neuroticism": {
        "trigger": lambda o: o.get("N", 0) >= 65,
        "priority_interventions": [
            "5-minute box breathing (inhale 4s, hold 4s, exhale 4s)",
            "Evening walk without devices — disconnection is recovery",
            "Body scan meditation before sleep",
        ],
        "defer_interventions": ["High-intensity gym sessions"],
        "label": "High-Neuroticism Profile — stress-first interventions",
    },
    # High Conscientiousness → structured plans, measurable goals
    "high_conscientiousness": {
        "trigger": lambda o: o.get("C", 0) >= 65,
        "priority_interventions": [
            "Set a 7-day sleep consistency target (±20 min bedtime)",
            "Log meals for 1 week to identify glucose patterns",
            "Weekly biometric review every Sunday morning",
        ],
        "defer_interventions": [],
        "label": "High-Conscientiousness Profile — structured plan approach",
    },
    # High Extraversion → social accountability
    "high_extraversion": {
        "trigger": lambda o: o.get("E", 0) >= 65,
        "priority_interventions": [
            "Join a walking group or group fitness class",
            "Share weekly goal with a family member for accountability",
            "Schedule social workouts — doubles adherence",
        ],
        "defer_interventions": ["Solo meditation apps"],
        "label": "High-Extraversion Profile — social accountability approach",
    },
    # Low Openness → simple, familiar habits
    "low_openness": {
        "trigger": lambda o: o.get("O", 0) <= 35,
        "priority_interventions": [
            "Build one sustainable habit first — same meal prep day weekly",
            "Stick to familiar exercise (walking, cycling) before adding new",
            "Small consistent changes compound — avoid overhauling everything at once",
        ],
        "defer_interventions": ["New biometric devices", "Experimental supplements"],
        "label": "Low-Openness Profile — familiar, sustainable habits",
    },
    # High Agreeableness → family/caregiving balance
    "high_agreeableness": {
        "trigger": lambda o: o.get("A", 0) >= 65,
        "priority_interventions": [
            "Schedule non-negotiable self-care blocks — you can't pour from an empty cup",
            "Set quiet morning routine before caretaking duties",
            "Delegate one household task per week to protect energy",
        ],
        "defer_interventions": [],
        "label": "High-Agreeableness Profile — caregiver balance approach",
    },
}


def personality_interventions(
    ocean_scores: Dict[str, float],
    biometrics: Dict[str, float],
    base_recommendations: List[str],
) -> Dict[str, Any]:
    """
    Reorder and augment recommendations based on OCEAN personality profile.
    OCEAN scores: {"O": 0-100, "C": 0-100, "E": 0-100, "A": 0-100, "N": 0-100}
    """
    matched_profiles = []
    priority_additions: List[str] = []
    deferred: List[str] = []

    for profile_key, profile in _OCEAN_INTERVENTION_MAP.items():
        if profile["trigger"](ocean_scores):
            matched_profiles.append(profile["label"])
            priority_additions.extend(profile["priority_interventions"])
            deferred.extend(profile["defer_interventions"])

    # Filter out deferred recommendations from base list
    filtered_base = [
        r for r in base_recommendations
        if not any(d.lower() in r.lower() for d in deferred)
    ]

    # Personality-specific interventions placed first
    final_recommendations = priority_additions + filtered_base

    # Deduplicate while preserving order
    seen: set = set()
    deduped = []
    for r in final_recommendations:
        key = r[:40].lower()
        if key not in seen:
            seen.add(key)
            deduped.append(r)

    return {
        "matched_profiles": matched_profiles,
        "ocean_scores": ocean_scores,
        "recommendations": deduped[:8],
        "deferred_recommendations": deferred,
        "personality_note": (
            matched_profiles[0] if matched_profiles
            else "Balanced OCEAN profile — standard recommendation order"
        ),
        "generated_at": datetime.utcnow().isoformat(),
    }


# ─────────────────────────────────────────────────────────────────────────────
# 4. GENERATIONAL TIMELINE (All three Saints)
#    Aggregate Joseph genealogy events + Raphael live metrics +
#    Gabriel wealth trend into a unified 4-generation timeline.
# ─────────────────────────────────────────────────────────────────────────────

def generational_timeline(
    family_members: List[Dict[str, Any]],
    live_heatmap: Optional[List[Dict[str, Any]]] = None,
    net_worth_history: Optional[List[Dict[str, Any]]] = None,
) -> Dict[str, Any]:
    """
    Build a 4-generation timeline combining:
      - Joseph layer: genealogy events (birth, death, conditions, milestones)
      - Raphael layer: current biometrics for living members
      - Gabriel layer: generational net worth / wealth trend
    """
    current_year = datetime.now().year
    generations: Dict[int, List[Dict[str, Any]]] = {}

    heatmap_by_id = {m["member_id"]: m for m in (live_heatmap or [])}

    for member in family_members:
        gen = member.get("generation", 0)
        birth_year = member.get("birthYear") or member.get("birth_year")
        death_year_raw = member.get("deathDate") or member.get("death_date")
        death_year = None
        if death_year_raw:
            try:
                death_year = int(str(death_year_raw)[:4])
            except (ValueError, TypeError):
                pass

        is_living = death_year is None
        age = (current_year - birth_year) if birth_year else None

        # Raphael layer — live health for living members
        health_data = None
        if is_living:
            hm = heatmap_by_id.get(member.get("id", ""))
            if hm:
                health_data = {
                    "wellness_score": hm["wellness_score"],
                    "risk_level": hm["risk_level"],
                    "trend": hm["trend"],
                    "trend_arrow": hm["trend_arrow"],
                    "colour": hm["colour"],
                }

        # Joseph layer — known conditions and life events
        conditions = member.get("conditions", member.get("known_conditions", []))
        if isinstance(conditions, str):
            conditions = [c.strip() for c in conditions.split(",") if c.strip()]

        timeline_entry = {
            "member_id": member.get("id"),
            "name": f"{member.get('firstName', '')} {member.get('lastName', '')}".strip(),
            "generation": gen,
            "birth_year": birth_year,
            "death_year": death_year,
            "age_at_death": (death_year - birth_year) if (death_year and birth_year) else None,
            "current_age": age if is_living else None,
            "is_living": is_living,
            "conditions": conditions,
            "occupation": member.get("occupation"),
            "health": health_data,  # Raphael layer
            "traits": member.get("traits", []),
        }

        generations.setdefault(gen, []).append(timeline_entry)

    # Gabriel layer — net worth timeline
    wealth_trend = None
    if net_worth_history and len(net_worth_history) >= 2:
        values = [float(e.get("value", 0)) for e in net_worth_history]
        wealth_trend = {
            "current": values[-1],
            "direction": detect_trend(values),
            "percent_change": round(
                (values[-1] - values[0]) / max(abs(values[0]), 1) * 100, 1
            ),
            "history": net_worth_history,
        }

    # Sort generations for display (oldest gen number = oldest ancestors)
    sorted_generations = sorted(generations.items(), key=lambda x: x[0])

    return {
        "timeline": [
            {
                "generation": gen,
                "generation_label": _generation_label(gen),
                "members": members,
            }
            for gen, members in sorted_generations
        ],
        "wealth_trend": wealth_trend,         # Gabriel layer
        "total_members": sum(len(m) for m in generations.values()),
        "living_members": sum(1 for gen in generations.values() for m in gen if m["is_living"]),
        "generated_at": datetime.utcnow().isoformat(),
    }


def _generation_label(gen: int) -> str:
    labels = {
        -3: "Great-Great-Grandparents",
        -2: "Great-Grandparents",
        -1: "Grandparents",
        0: "Parents",
        1: "Current Generation",
        2: "Children",
        3: "Grandchildren",
    }
    return labels.get(gen, f"Generation {gen}")


# ─────────────────────────────────────────────────────────────────────────────
# 5. CONTAGION GRAPH (Joseph → Raphael ContagionEngine)
#    Build relationship-weighted graph from Joseph's family tree and feed it
#    to ContagionEngine for genealogy-aware household stress detection.
# ─────────────────────────────────────────────────────────────────────────────

# Relationship proximity weights (higher = stronger behavioral contagion)
_RELATIONSHIP_WEIGHTS = {
    "spouse": 1.0,        # Cohabiting partners — highest contagion
    "child": 0.85,        # Parent-child daily interaction
    "parent": 0.85,
    "sibling": 0.6,       # Sibling — shared upbringing, often cohabiting young
    "grandparent": 0.35,
    "grandchild": 0.35,
}


def contagion_graph(
    family_members: List[Dict[str, Any]],
    relationships: List[Dict[str, Any]],
    metrics_by_member: Dict[str, List[Dict[str, Any]]],
) -> Dict[str, Any]:
    """
    Build a relationship-weighted contagion graph from Joseph's family tree
    and run ContagionEngine.analyze_family() with genealogy-aware weights.

    relationships: [{"from_id": "...", "to_id": "...", "type": "spouse|child|parent|sibling"}]
    metrics_by_member: { member_id: [metric_readings] }
    """
    # Build adjacency with weights derived from relationship type
    graph_edges: List[Dict[str, Any]] = []
    for rel in relationships:
        weight = _RELATIONSHIP_WEIGHTS.get(rel.get("type", "sibling"), 0.3)
        graph_edges.append({
            "from": rel["from_id"],
            "to": rel["to_id"],
            "type": rel.get("type", "unknown"),
            "weight": weight,
        })

    # Prepare member data for ContagionEngine
    members_with_metrics = []
    for member in family_members:
        mid = member.get("id", "")
        members_with_metrics.append({
            **member,
            "metrics_history": metrics_by_member.get(mid, []),
        })

    # Run ContagionEngine analysis with relationship graph context
    try:
        contagion_result = _contagion.analyze_family(
            members=members_with_metrics,
            relationship_graph=graph_edges,
        )
    except TypeError:
        # Fallback: ContagionEngine doesn't yet accept relationship_graph arg
        contagion_result = _contagion.analyze_family(members=members_with_metrics)

    # Enrich result with relationship context
    hotspots = contagion_result.get("contagion_hotspots", [])
    alerts = []
    for hotspot in hotspots:
        source_id = hotspot.get("source_member_id")
        # Find all high-weight neighbors of this hotspot
        neighbors = [
            e for e in graph_edges
            if (e["from"] == source_id or e["to"] == source_id) and e["weight"] >= 0.6
        ]
        if neighbors:
            neighbor_names = []
            for edge in neighbors:
                other_id = edge["to"] if edge["from"] == source_id else edge["from"]
                other = next((m for m in family_members if m.get("id") == other_id), None)
                if other:
                    neighbor_names.append(
                        f"{other.get('firstName', '')} {other.get('lastName', '')}".strip()
                    )
            if neighbor_names:
                alerts.append({
                    "type": "household_contagion",
                    "severity": hotspot.get("risk_level", "moderate"),
                    "source": hotspot.get("source_member_name", source_id),
                    "at_risk_members": neighbor_names,
                    "metric": hotspot.get("metric", "unknown"),
                    "message": (
                        f"{hotspot.get('source_member_name', 'A family member')}'s "
                        f"{hotspot.get('metric', 'health metric')} trend may be influencing "
                        f"{', '.join(neighbor_names)} — consider a joint family intervention."
                    ),
                })

    return {
        **contagion_result,
        "relationship_graph": graph_edges,
        "household_alerts": alerts,
        "alert_count": len(alerts),
        "generated_at": datetime.utcnow().isoformat(),
    }


# ─────────────────────────────────────────────────────────────────────────────
# 6. FINANCIAL HEALTH BRIDGE (Gabriel → Joseph + Raphael)
#    Correlate Gabriel spending patterns with biometric improvements.
#    Returns health investment ROI, financial stress indicator, and
#    emergency readiness check against Raphael's predicted risk.
# ─────────────────────────────────────────────────────────────────────────────

_HEALTH_ENVELOPE_KEYWORDS = {
    "gym", "fitness", "crossfit", "yoga", "pilates", "swimming",
    "health", "medical", "doctor", "pharmacy", "prescription",
    "supplements", "vitamins", "protein", "therapy", "counseling",
    "dental", "vision", "wellness", "massage", "physio",
}

_STRESS_ENVELOPE_KEYWORDS = {
    "debt", "loan", "credit", "overdraft", "late fee", "penalty",
}


def financial_health_bridge(
    member_id: str,
    budget_envelopes: List[Dict[str, Any]],
    metrics_history: List[Dict[str, Any]],
    net_worth: float,
    health_risk_score: float,
) -> Dict[str, Any]:
    """
    Correlate Gabriel's spending with Raphael's biometrics:
    - Health investment spend (gym/supplements/therapy)
    - Financial stress detection (overspent envelopes → HRV/sleep impact)
    - Health investment ROI (spend correlated with biometric improvements)
    - Emergency readiness check (is emergency envelope funded vs. risk level?)
    """
    # ── Health investment spend ────────────────────────────────────────────
    health_spend = 0.0
    health_categories_found: List[str] = []
    emergency_balance = 0.0
    overspent_envelopes: List[str] = []

    for env in budget_envelopes:
        cat = str(env.get("category_name", "")).lower()
        assigned = float(env.get("assigned", 0))
        available = float(env.get("available", 0))
        activity = float(env.get("activity", 0))

        # Health-related spend
        if any(kw in cat for kw in _HEALTH_ENVELOPE_KEYWORDS):
            health_spend += abs(activity)  # activity is negative (spent)
            health_categories_found.append(env.get("category_name", cat))

        # Emergency fund
        if "emergency" in cat:
            emergency_balance = available

        # Overspent envelopes (financial stress signal)
        if available < 0:
            overspent_envelopes.append(env.get("category_name", cat))

    # ── Financial stress score (0-100) ────────────────────────────────────
    financial_stress_score = min(100.0, len(overspent_envelopes) * 18.0)
    financial_stress_level = risk_level(financial_stress_score)

    # ── Biometric-spend correlation ────────────────────────────────────────
    # Look for HRV and sleep trends in metrics history
    hrv_values = [
        float(m["value"]) for m in metrics_history
        if m.get("metric") in (Metric.HRV, "hrv", "heart_rate_variability")
    ][-12:]
    sleep_values = [
        float(m["value"]) for m in metrics_history
        if m.get("metric") in (Metric.SLEEP_DURATION, "sleep_duration", "sleep")
    ][-12:]

    hrv_trend = detect_trend(hrv_values) if len(hrv_values) >= 3 else "unknown"
    sleep_trend = detect_trend(sleep_values) if len(sleep_values) >= 3 else "unknown"

    # Health ROI narrative
    roi_insight: Optional[str] = None
    if health_spend > 0:
        if hrv_trend == "rising":
            roi_insight = (
                f"You're spending ${health_spend:.0f}/mo on health — "
                f"HRV is trending upward. Your health investment is paying off."
            )
        elif hrv_trend == "falling" and health_spend > 100:
            roi_insight = (
                f"You're spending ${health_spend:.0f}/mo on health but HRV is trending down. "
                f"Recovery quality may need attention even with active spending."
            )
        else:
            roi_insight = (
                f"${health_spend:.0f}/mo health investment — tracking {hrv_trend} HRV trend."
            )

    # ── Emergency readiness vs. health risk ───────────────────────────────
    risk_lv = risk_level(health_risk_score)
    emergency_months = (
        round(emergency_balance / max(abs(sum(
            float(e.get("activity", 0)) for e in budget_envelopes
        )), 1), 1)
        if emergency_balance > 0 else 0
    )

    emergency_status = "adequate"
    emergency_alert: Optional[str] = None
    if risk_lv in ("high", "critical") and emergency_months < 3:
        emergency_status = "insufficient"
        emergency_alert = (
            f"Your health risk is {risk_lv} but your emergency fund covers only "
            f"{emergency_months} months. Consider building a medical emergency buffer."
        )
    elif emergency_months >= 6:
        emergency_status = "strong"

    # ── Financial stress → biometric alert ────────────────────────────────
    financial_stress_alert: Optional[str] = None
    if financial_stress_level in ("high", "critical"):
        financial_stress_alert = (
            f"{len(overspent_envelopes)} budget envelopes are overspent "
            f"({', '.join(overspent_envelopes[:3])}). "
            f"Financial stress typically suppresses HRV and disrupts sleep."
        )

    return {
        "member_id": member_id,
        # Gabriel data
        "health_spend_monthly": round(health_spend, 2),
        "health_categories": health_categories_found,
        "financial_stress_score": round(financial_stress_score, 1),
        "financial_stress_level": financial_stress_level,
        "overspent_envelopes": overspent_envelopes,
        "emergency_balance": round(emergency_balance, 2),
        "emergency_months": emergency_months,
        "emergency_status": emergency_status,
        # Cross-domain insights
        "health_investment_roi": roi_insight,
        "hrv_trend": hrv_trend,
        "sleep_trend": sleep_trend,
        "emergency_alert": emergency_alert,
        "financial_stress_alert": financial_stress_alert,
        "generated_at": datetime.utcnow().isoformat(),
    }

# ═════════════════════════════════════════════════════════════════════════════
# OPTIONS 7-16: EXTENDED THREE-SAINT INTEGRATIONS
# ═════════════════════════════════════════════════════════════════════════════


# ─────────────────────────────────────────────────────────────────────────────
# 7. TRINITY COUNCIL (All 3 Saints in one conversation)
# ─────────────────────────────────────────────────────────────────────────────

def trinity_council(
    user_message: str,
    member_id: str = "user",
    family_members: List[Dict[str, Any]] = None,
    metrics_history: List[Dict[str, Any]] = None,
    budget_envelopes: List[Dict[str, Any]] = None,
    ocean_scores: Optional[Dict[str, float]] = None,
) -> Dict[str, Any]:
    """
    Multi-agent response: Joseph, Raphael, and Gabriel each contribute
    domain-specific advice to a single user question.
    """
    family_members = family_members or []
    metrics_history = metrics_history or []
    budget_envelopes = budget_envelopes or []

    # Build context for each Saint
    joseph_context = {
        "family_size": len(family_members),
        "ocean_profile": ocean_scores or {},
        "hereditary_conditions": [],
    }
    for m in family_members:
        conds = m.get("conditions", m.get("known_conditions", []))
        if isinstance(conds, str):
            conds = [c.strip() for c in conds.split(",") if c.strip()]
        joseph_context["hereditary_conditions"].extend(conds)
    joseph_context["hereditary_conditions"] = list(set(joseph_context["hereditary_conditions"]))

    raphael_context = {
        "metrics_count": len(metrics_history),
        "latest_metrics": metrics_history[-5:] if metrics_history else [],
    }

    gabriel_context = {
        "envelopes_count": len(budget_envelopes),
        "total_budget": sum(float(e.get("assigned", 0)) for e in budget_envelopes),
        "overspent": [e.get("category_name", "") for e in budget_envelopes if float(e.get("available", 0)) < 0],
    }

    # Generate Saint responses based on context
    joseph_response = _council_joseph(user_message, joseph_context)
    raphael_response = _council_raphael(user_message, raphael_context, metrics_history)
    gabriel_response = _council_gabriel(user_message, gabriel_context, budget_envelopes)

    return {
        "user_message": user_message,
        "responses": [
            {"saint": "joseph", "icon": "GitBranch", "color": "#f59e0b", "response": joseph_response},
            {"saint": "raphael", "icon": "Heart", "color": "#14b8a6", "response": raphael_response},
            {"saint": "gabriel", "icon": "Wallet", "color": "#10b981", "response": gabriel_response},
        ],
        "generated_at": datetime.utcnow().isoformat(),
    }


def _council_joseph(msg: str, ctx: Dict) -> str:
    parts = []
    if ctx["hereditary_conditions"]:
        parts.append(f"From your family tree, I see conditions like {', '.join(ctx['hereditary_conditions'][:3])}.")
    if ctx["ocean_profile"]:
        n = ctx["ocean_profile"].get("N", 50)
        if n >= 65:
            parts.append("Your personality profile suggests a sensitive disposition — gradual changes work best for you.")
        elif ctx["ocean_profile"].get("C", 50) >= 65:
            parts.append("Your structured personality means you'll thrive with a clear, measurable plan.")
    parts.append(f"Your family of {ctx['family_size']} members provides a support network — use it.")
    return " ".join(parts) if parts else "I'm here with genealogical context when you need it."


def _council_raphael(msg: str, ctx: Dict, metrics: List) -> str:
    parts = []
    if ctx["latest_metrics"]:
        last = ctx["latest_metrics"][-1]
        parts.append(f"Your latest reading shows {last.get('metric', 'biometric')}: {last.get('value', '?')}.")
    if len(metrics) >= 5:
        values = [float(m.get("value", 0)) for m in metrics[-10:]]
        trend = detect_trend(values)
        parts.append(f"Your overall biometric trend is {trend}.")
    parts.append("I'm monitoring your vitals continuously for early warning signals.")
    return " ".join(parts) if parts else "I'm tracking your health trajectory — ask me about any specific metric."


def _council_gabriel(msg: str, ctx: Dict, envelopes: List) -> str:
    parts = []
    if ctx["total_budget"] > 0:
        parts.append(f"Your total monthly budget is ${ctx['total_budget']:.0f}.")
    if ctx["overspent"]:
        parts.append(f"Watch out: {', '.join(ctx['overspent'][:3])} are overspent this month.")
    health_spend = sum(
        abs(float(e.get("activity", 0))) for e in envelopes
        if any(kw in str(e.get("category_name", "")).lower() for kw in ("health", "gym", "medical", "wellness"))
    )
    if health_spend > 0:
        parts.append(f"You're investing ${health_spend:.0f}/mo in health-related categories.")
    return " ".join(parts) if parts else "I'm watching your financial health — happy to advise on budgeting."


# ─────────────────────────────────────────────────────────────────────────────
# 8. CROSS-SAINT GOAL ENGINE (Goals that span all 3 Saints)
# ─────────────────────────────────────────────────────────────────────────────

def cross_saint_goal(
    goal_name: str,
    goal_type: str = "health",
    health_target: Optional[Dict[str, Any]] = None,
    budget_allocation: Optional[Dict[str, Any]] = None,
    family_tracking: Optional[List[str]] = None,
    metrics_history: List[Dict[str, Any]] = None,
    budget_envelopes: List[Dict[str, Any]] = None,
) -> Dict[str, Any]:
    """
    Create a unified goal that lives across all 3 Saints.
    Returns progress metrics from each Saint's perspective.
    """
    metrics_history = metrics_history or []
    budget_envelopes = budget_envelopes or []
    family_tracking = family_tracking or []

    # Raphael axis: health metric progress
    health_progress = 0.0
    if health_target:
        target_metric = health_target.get("metric", "wellness_composite")
        target_value = float(health_target.get("target_value", 0))
        current_values = [
            float(m.get("value", 0)) for m in metrics_history
            if m.get("metric") == target_metric
        ]
        if current_values and target_value > 0:
            health_progress = min(100.0, (current_values[-1] / target_value) * 100)

    # Gabriel axis: budget allocation tracking
    finance_progress = 0.0
    if budget_allocation:
        target_category = budget_allocation.get("category", "health")
        target_monthly = float(budget_allocation.get("monthly_amount", 0))
        actual_spend = sum(
            abs(float(e.get("activity", 0))) for e in budget_envelopes
            if target_category.lower() in str(e.get("category_name", "")).lower()
        )
        if target_monthly > 0:
            finance_progress = min(100.0, (actual_spend / target_monthly) * 100)

    # Joseph axis: family member participation
    family_progress = len(family_tracking) * 25.0  # 25% per family member engaged
    family_progress = min(100.0, family_progress)

    # Composite goal score
    composite = (health_progress * 0.40 + finance_progress * 0.30 + family_progress * 0.30)

    return {
        "goal_name": goal_name,
        "goal_type": goal_type,
        "composite_progress": round(composite, 1),
        "axes": {
            "raphael": {
                "label": "Health Target",
                "progress": round(health_progress, 1),
                "detail": health_target,
            },
            "gabriel": {
                "label": "Financial Commitment",
                "progress": round(finance_progress, 1),
                "detail": budget_allocation,
            },
            "joseph": {
                "label": "Family Participation",
                "progress": round(family_progress, 1),
                "members_engaged": family_tracking,
            },
        },
        "status": "on_track" if composite >= 60 else "needs_attention" if composite >= 30 else "at_risk",
        "generated_at": datetime.utcnow().isoformat(),
    }


# ─────────────────────────────────────────────────────────────────────────────
# 9. FAMILY VITALITY SCORE (Composite 0-100 across all 3 Saints)
# ─────────────────────────────────────────────────────────────────────────────

def family_vitality_score(
    family_members: List[Dict[str, Any]] = None,
    metrics_history: List[Dict[str, Any]] = None,
    budget_envelopes: List[Dict[str, Any]] = None,
    net_worth: float = 0.0,
    monthly_income: float = 0.0,
) -> Dict[str, Any]:
    """
    Single composite family score (0-100) combining:
    - 40% Joseph generational health risk (inverted)
    - 35% Raphael current biometric wellness
    - 25% Gabriel financial health
    """
    family_members = family_members or []
    metrics_history = metrics_history or []
    budget_envelopes = budget_envelopes or []

    # Joseph component (40%): inversed generational risk
    total_conditions = 0
    for m in family_members:
        conds = m.get("conditions", m.get("known_conditions", []))
        if isinstance(conds, str):
            conds = [c.strip() for c in conds.split(",") if c.strip()]
        total_conditions += len(conds)
    condition_density = total_conditions / max(len(family_members), 1)
    joseph_raw = max(0, 100 - (condition_density * 25))  # Each condition reduces by 25

    # Raphael component (35%): current biometric wellness
    if metrics_history:
        values = [float(m.get("value", 50)) for m in metrics_history[-20:]]
        avg_value = sum(values) / len(values)
        raphael_raw = max(0, 100 - avg_value)  # Lower risk value = higher wellness
    else:
        raphael_raw = 50.0

    # Gabriel component (25%): financial health
    savings_rate = 0.0
    emergency_months = 0.0
    overspent_count = 0
    if budget_envelopes:
        total_assigned = sum(float(e.get("assigned", 0)) for e in budget_envelopes)
        total_spent = sum(abs(float(e.get("activity", 0))) for e in budget_envelopes)
        savings_rate = max(0, (total_assigned - total_spent) / max(total_assigned, 1) * 100)
        overspent_count = sum(1 for e in budget_envelopes if float(e.get("available", 0)) < 0)
        emergency_bal = sum(
            float(e.get("available", 0)) for e in budget_envelopes
            if "emergency" in str(e.get("category_name", "")).lower()
        )
        if total_spent > 0:
            emergency_months = emergency_bal / max(total_spent, 1)

    gabriel_raw = min(100, savings_rate + (emergency_months * 10) - (overspent_count * 15))
    gabriel_raw = max(0, gabriel_raw)

    # Composite
    composite = (joseph_raw * 0.40) + (raphael_raw * 0.35) + (gabriel_raw * 0.25)

    return {
        "vitality_score": round(composite, 1),
        "vitality_level": risk_level(100 - composite),  # Invert for risk level
        "breakdown": {
            "joseph": {"score": round(joseph_raw, 1), "weight": 40, "label": "Generational Health"},
            "raphael": {"score": round(raphael_raw, 1), "weight": 35, "label": "Current Wellness"},
            "gabriel": {"score": round(gabriel_raw, 1), "weight": 25, "label": "Financial Health"},
        },
        "insights": {
            "condition_density": round(condition_density, 2),
            "savings_rate": round(savings_rate, 1),
            "emergency_months": round(emergency_months, 1),
            "overspent_envelopes": overspent_count,
        },
        "generated_at": datetime.utcnow().isoformat(),
    }


# ─────────────────────────────────────────────────────────────────────────────
# 10. EMERGENCY ALERT CHAIN (Raphael → Gabriel → Joseph cascade)
# ─────────────────────────────────────────────────────────────────────────────

def emergency_alert_chain(
    member_id: str,
    critical_metric: str,
    critical_value: float,
    metrics_history: List[Dict[str, Any]] = None,
    budget_envelopes: List[Dict[str, Any]] = None,
    family_members: List[Dict[str, Any]] = None,
) -> Dict[str, Any]:
    """
    Cascade: Raphael detects critical → Gabriel checks funds → Joseph finds next-of-kin.
    """
    metrics_history = metrics_history or []
    budget_envelopes = budget_envelopes or []
    family_members = family_members or []

    # Step 1: Raphael — assess severity
    risk_lv = risk_level(critical_value)
    is_critical = risk_lv in ("high", "critical")

    # Step 2: Gabriel — check emergency fund
    emergency_balance = sum(
        float(e.get("available", 0)) for e in budget_envelopes
        if "emergency" in str(e.get("category_name", "")).lower()
    )
    monthly_spend = sum(abs(float(e.get("activity", 0))) for e in budget_envelopes)
    emergency_months = emergency_balance / max(monthly_spend, 1) if monthly_spend > 0 else 0
    fund_adequate = emergency_months >= 3

    # Step 3: Joseph — identify next-of-kin
    next_of_kin = []
    for m in family_members:
        rel = m.get("relationship", m.get("relation", ""))
        if rel in ("spouse", "partner", "parent", "child", "sibling"):
            next_of_kin.append({
                "name": f"{m.get('firstName', '')} {m.get('lastName', '')}".strip(),
                "relationship": rel,
                "member_id": m.get("id", ""),
            })

    alert_level = "critical" if is_critical and not fund_adequate else "high" if is_critical else "moderate"

    return {
        "alert_level": alert_level,
        "cascade": {
            "raphael": {
                "step": 1,
                "status": "triggered",
                "metric": critical_metric,
                "value": critical_value,
                "risk_level": risk_lv,
                "message": f"{critical_metric} at {critical_value} — risk level: {risk_lv}",
            },
            "gabriel": {
                "step": 2,
                "status": "checked",
                "emergency_balance": round(emergency_balance, 2),
                "emergency_months": round(emergency_months, 1),
                "fund_adequate": fund_adequate,
                "message": f"Emergency fund: ${emergency_balance:.0f} ({emergency_months:.1f} months coverage)",
            },
            "joseph": {
                "step": 3,
                "status": "identified",
                "next_of_kin": next_of_kin[:5],
                "message": f"{len(next_of_kin)} family contacts identified for emergency notification",
            },
        },
        "recommended_action": (
            "Immediate family notification recommended — health risk is critical and emergency funds are low."
            if alert_level == "critical"
            else "Monitor closely — health risk elevated but finances are stable."
            if alert_level == "high"
            else "Continue routine monitoring."
        ),
        "generated_at": datetime.utcnow().isoformat(),
    }


# ─────────────────────────────────────────────────────────────────────────────
# 11. SEASONAL HEALTH-FINANCE CALENDAR (Time-aware 3-Saint predictions)
# ─────────────────────────────────────────────────────────────────────────────

_MONTH_NAMES = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]

def seasonal_calendar(
    family_members: List[Dict[str, Any]] = None,
    metrics_history: List[Dict[str, Any]] = None,
    budget_envelopes: List[Dict[str, Any]] = None,
    transaction_history: List[Dict[str, Any]] = None,
) -> Dict[str, Any]:
    """
    12-month calendar showing seasonal patterns across all 3 Saints.
    """
    family_members = family_members or []
    metrics_history = metrics_history or []
    transaction_history = transaction_history or []

    # Joseph layer: family health events by month
    family_events_by_month: Dict[int, List[str]] = {i: [] for i in range(1, 13)}
    for m in family_members:
        death_date = m.get("deathDate", m.get("death_date", ""))
        if death_date:
            try:
                month = int(str(death_date)[5:7])
                name = f"{m.get('firstName', '')} {m.get('lastName', '')}".strip()
                conds = m.get("conditions", m.get("known_conditions", []))
                if isinstance(conds, str):
                    conds = [c.strip() for c in conds.split(",")]
                event = f"{name}: {', '.join(conds[:2]) if conds else 'passed'}"
                family_events_by_month[month].append(event)
            except (ValueError, IndexError):
                pass

    # Raphael layer: biometric stress by month
    metric_months: Dict[int, List[float]] = {i: [] for i in range(1, 13)}
    for m in metrics_history:
        ts = m.get("timestamp", m.get("date", ""))
        if ts:
            try:
                month = int(str(ts)[5:7])
                metric_months[month].append(float(m.get("value", 50)))
            except (ValueError, IndexError):
                pass

    # Gabriel layer: spending pressure by month
    spend_months: Dict[int, float] = {i: 0.0 for i in range(1, 13)}
    for t in transaction_history:
        ts = t.get("date", t.get("timestamp", ""))
        if ts:
            try:
                month = int(str(ts)[5:7])
                spend_months[month] += abs(float(t.get("amount", 0)))
            except (ValueError, IndexError):
                pass

    avg_monthly_spend = sum(spend_months.values()) / 12 if any(spend_months.values()) else 1

    # Build calendar
    calendar = []
    for month_num in range(1, 13):
        joseph_events = family_events_by_month[month_num]
        raphael_values = metric_months[month_num]
        raphael_avg = sum(raphael_values) / len(raphael_values) if raphael_values else None
        gabriel_spend = spend_months[month_num]
        gabriel_pressure = "high" if gabriel_spend > avg_monthly_spend * 1.3 else "normal" if gabriel_spend > 0 else "no_data"

        risk_flags = []
        if joseph_events:
            risk_flags.append("family_history")
        if raphael_avg and raphael_avg > 60:
            risk_flags.append("biometric_stress")
        if gabriel_pressure == "high":
            risk_flags.append("financial_pressure")

        calendar.append({
            "month": month_num,
            "month_name": _MONTH_NAMES[month_num - 1],
            "joseph": {"family_events": joseph_events, "event_count": len(joseph_events)},
            "raphael": {"avg_risk_score": round(raphael_avg, 1) if raphael_avg else None, "data_points": len(raphael_values)},
            "gabriel": {"total_spend": round(gabriel_spend, 2), "pressure": gabriel_pressure},
            "risk_flags": risk_flags,
            "combined_risk": len(risk_flags),
        })

    return {
        "calendar": calendar,
        "high_risk_months": [c["month_name"] for c in calendar if c["combined_risk"] >= 2],
        "generated_at": datetime.utcnow().isoformat(),
    }


# ─────────────────────────────────────────────────────────────────────────────
# 12. FAMILY CHRONICLE (Unified life + health + financial milestone timeline)
# ─────────────────────────────────────────────────────────────────────────────

def family_chronicle(
    family_members: List[Dict[str, Any]] = None,
    health_milestones: List[Dict[str, Any]] = None,
    financial_milestones: List[Dict[str, Any]] = None,
) -> Dict[str, Any]:
    """
    Unified chronicle of life, health, and financial milestones.
    """
    family_members = family_members or []
    health_milestones = health_milestones or []
    financial_milestones = financial_milestones or []

    entries = []

    # Joseph: births, deaths, life events
    for m in family_members:
        name = f"{m.get('firstName', '')} {m.get('lastName', '')}".strip()
        birth_year = m.get("birthYear", m.get("birth_year"))
        if birth_year:
            entries.append({
                "date": f"{birth_year}-01-01",
                "year": birth_year,
                "saint": "joseph",
                "type": "birth",
                "icon": "Baby",
                "title": f"{name} born",
                "description": f"Born in {birth_year}",
                "color": "#f59e0b",
            })
        death_date = m.get("deathDate", m.get("death_date"))
        if death_date:
            year = int(str(death_date)[:4]) if death_date else None
            conds = m.get("conditions", m.get("known_conditions", []))
            if isinstance(conds, str):
                conds = [c.strip() for c in conds.split(",") if c.strip()]
            entries.append({
                "date": str(death_date)[:10],
                "year": year,
                "saint": "joseph",
                "type": "death",
                "icon": "Heart",
                "title": f"{name} passed",
                "description": f"Conditions: {', '.join(conds[:3])}" if conds else "Cause not recorded",
                "color": "#94a3b8",
            })

    # Raphael: health milestones
    for h in health_milestones:
        entries.append({
            "date": h.get("date", ""),
            "year": int(str(h.get("date", "2024"))[:4]),
            "saint": "raphael",
            "type": "health_milestone",
            "icon": "Activity",
            "title": h.get("title", "Health milestone"),
            "description": h.get("description", ""),
            "color": "#14b8a6",
        })

    # Gabriel: financial milestones
    for f in financial_milestones:
        entries.append({
            "date": f.get("date", ""),
            "year": int(str(f.get("date", "2024"))[:4]),
            "saint": "gabriel",
            "type": "financial_milestone",
            "icon": "Wallet",
            "title": f.get("title", "Financial milestone"),
            "description": f.get("description", ""),
            "color": "#10b981",
        })

    entries.sort(key=lambda e: e.get("date", ""), reverse=True)

    return {
        "entries": entries,
        "total_entries": len(entries),
        "by_saint": {
            "joseph": len([e for e in entries if e["saint"] == "joseph"]),
            "raphael": len([e for e in entries if e["saint"] == "raphael"]),
            "gabriel": len([e for e in entries if e["saint"] == "gabriel"]),
        },
        "generated_at": datetime.utcnow().isoformat(),
    }


# ─────────────────────────────────────────────────────────────────────────────
# 13. ELDER CARE COORDINATION (Joseph + Raphael + Gabriel for elderly members)
# ─────────────────────────────────────────────────────────────────────────────

def elder_care_plan(
    family_members: List[Dict[str, Any]] = None,
    metrics_by_member: Dict[str, List[Dict[str, Any]]] = None,
    budget_envelopes: List[Dict[str, Any]] = None,
    monthly_income: float = 0.0,
) -> Dict[str, Any]:
    """
    Elder care coordination for family members >= 65.
    """
    family_members = family_members or []
    metrics_by_member = metrics_by_member or {}
    budget_envelopes = budget_envelopes or []
    current_year = datetime.now().year

    elder_plans = []
    for m in family_members:
        birth_year = m.get("birthYear", m.get("birth_year"))
        if not birth_year:
            continue
        age = current_year - birth_year
        if age < 65:
            continue

        death_date = m.get("deathDate", m.get("death_date"))
        if death_date:
            continue  # Skip deceased

        name = f"{m.get('firstName', '')} {m.get('lastName', '')}".strip()
        member_id = m.get("id", "")

        # Raphael: health trajectory
        member_metrics = metrics_by_member.get(member_id, [])
        if member_metrics:
            values = [float(x.get("value", 50)) for x in member_metrics[-10:]]
            trend = detect_trend(values)
            risk_score = sum(values) / len(values)
        else:
            trend = "unknown"
            risk_score = 50.0

        risk_lv = risk_level(risk_score)

        # Conditions
        conds = m.get("conditions", m.get("known_conditions", []))
        if isinstance(conds, str):
            conds = [c.strip() for c in conds.split(",") if c.strip()]

        # Gabriel: estimated monthly care cost
        base_cost = 800  # Base monthly support
        if risk_lv == "high":
            base_cost = 2400
        elif risk_lv == "critical":
            base_cost = 4200
        elif risk_lv == "moderate":
            base_cost = 1500

        if len(conds) > 2:
            base_cost *= 1.3  # Multiple conditions surcharge

        # Check current elder care budget
        elder_budget = sum(
            float(e.get("assigned", 0)) for e in budget_envelopes
            if any(kw in str(e.get("category_name", "")).lower() for kw in ("elder", "care", "parent", "senior"))
        )
        coverage_ratio = elder_budget / max(base_cost, 1)

        elder_plans.append({
            "member_id": member_id,
            "name": name,
            "age": age,
            "conditions": conds,
            "health_trajectory": trend,
            "risk_level": risk_lv,
            "risk_score": round(risk_score, 1),
            "estimated_monthly_cost": round(base_cost, 0),
            "current_budget": round(elder_budget, 0),
            "coverage_ratio": round(coverage_ratio, 2),
            "coverage_status": "funded" if coverage_ratio >= 0.8 else "underfunded" if coverage_ratio >= 0.4 else "critical",
            "care_type": "nursing" if risk_lv in ("high", "critical") else "assisted" if risk_lv == "moderate" else "independent",
        })

    total_cost = sum(p["estimated_monthly_cost"] for p in elder_plans)
    total_budget = sum(p["current_budget"] for p in elder_plans)

    return {
        "elder_members": elder_plans,
        "total_elders": len(elder_plans),
        "total_monthly_cost": round(total_cost, 0),
        "total_budget_allocated": round(total_budget, 0),
        "family_coverage_gap": round(max(0, total_cost - total_budget), 0),
        "overall_status": "adequate" if total_budget >= total_cost * 0.8 else "attention_needed",
        "generated_at": datetime.utcnow().isoformat(),
    }


# ─────────────────────────────────────────────────────────────────────────────
# 14. BEHAVIORAL NUDGE ENGINE (OCEAN × stress × budget nudges)
# ─────────────────────────────────────────────────────────────────────────────

def behavioral_nudge(
    ocean_scores: Optional[Dict[str, float]] = None,
    current_stress: float = 50.0,
    current_hrv: float = 50.0,
    budget_pressure: float = 0.0,
    overspent_categories: List[str] = None,
    time_of_day: str = "morning",
) -> Dict[str, Any]:
    """
    Real-time behavioral nudge combining OCEAN, biometrics, and financial pressure.
    """
    ocean_scores = ocean_scores or {"O": 50, "C": 50, "E": 50, "A": 50, "N": 50}
    overspent_categories = overspent_categories or []

    N = float(ocean_scores.get("N", 50))
    C = float(ocean_scores.get("C", 50))
    E = float(ocean_scores.get("E", 50))

    nudges = []

    # High stress + financial pressure → calming, free activities
    if current_stress > 65 and budget_pressure > 50:
        nudges.append({
            "priority": "immediate",
            "color": "#ef4444",
            "sources": ["raphael", "gabriel"],
            "title": "Stress + Financial Pressure Detected",
            "message": (
                f"Your stress level is elevated ({current_stress:.0f}/100) and "
                f"{'you have overspent envelopes' if overspent_categories else 'budget is tight'}. "
                "Try a 20-min walk — free, cortisol-cutting, and your HRV improves 11% from walks."
            ),
            "action": "Go for a walk",
        })

    # Low HRV + high neuroticism → gentle recovery
    if current_hrv < 40 and N >= 60:
        nudges.append({
            "priority": "immediate",
            "color": "#ef4444",
            "sources": ["raphael", "joseph"],
            "title": "HRV Low — Gentle Recovery Needed",
            "message": (
                f"Your HRV is low ({current_hrv:.0f}ms) and your personality profile suggests "
                "you respond best to gentle interventions. Try 4-7-8 breathing: inhale 4s, hold 7s, exhale 8s."
            ),
            "action": "Start breathing exercise",
        })

    # High conscientiousness → measurable daily target
    if C >= 65 and time_of_day == "morning":
        nudges.append({
            "priority": "today",
            "color": "#f59e0b",
            "sources": ["joseph"],
            "title": "Your Daily Structure",
            "message": "Your structured personality thrives on measurable targets. Today: 7,000 steps, 7.5h sleep tonight, log one meal.",
            "action": "Set daily targets",
        })

    # High extraversion → social accountability
    if E >= 65:
        nudges.append({
            "priority": "weekly",
            "color": "#10b981",
            "sources": ["joseph", "raphael"],
            "title": "Social Health Check-in",
            "message": "You thrive on social accountability. Share your weekly health progress with a family member this week.",
            "action": "Share progress",
        })

    # Financial overspend → targeted advice
    if overspent_categories:
        nudges.append({
            "priority": "today",
            "color": "#f59e0b",
            "sources": ["gabriel"],
            "title": f"Budget Alert: {', '.join(overspent_categories[:2])}",
            "message": f"These categories are overspent. Review and reallocate from lower-priority envelopes.",
            "action": "Review budget",
        })

    # Default gentle nudge if nothing triggered
    if not nudges:
        nudges.append({
            "priority": "weekly",
            "color": "#10b981",
            "sources": ["raphael", "gabriel", "joseph"],
            "title": "All Systems Healthy",
            "message": "Your health, finances, and family indicators are stable. Keep up the current routine.",
            "action": "Review dashboard",
        })

    return {
        "nudges": nudges,
        "nudge_count": len(nudges),
        "context": {
            "stress_level": current_stress,
            "hrv": current_hrv,
            "budget_pressure": budget_pressure,
            "personality_flags": {
                "high_neuroticism": N >= 65,
                "high_conscientiousness": C >= 65,
                "high_extraversion": E >= 65,
            },
        },
        "generated_at": datetime.utcnow().isoformat(),
    }


# ─────────────────────────────────────────────────────────────────────────────
# 15. INHERITANCE + HEALTH DIRECTIVE (Estate + prognosis + heir plan)
# ─────────────────────────────────────────────────────────────────────────────

def inheritance_directive(
    member_id: str,
    member_name: str = "",
    health_risk_score: float = 50.0,
    health_trajectory: str = "stable",
    conditions: List[str] = None,
    estate_value: float = 0.0,
    estate_assets: List[Dict[str, Any]] = None,
    heirs: List[Dict[str, Any]] = None,
    care_preferences: Optional[Dict[str, Any]] = None,
) -> Dict[str, Any]:
    """
    Generate an inheritance and health directive briefing.
    """
    conditions = conditions or []
    estate_assets = estate_assets or []
    heirs = heirs or []

    risk_lv = risk_level(health_risk_score)
    urgency = "high" if risk_lv in ("high", "critical") else "moderate" if risk_lv == "moderate" else "low"

    # Health prognosis (Raphael)
    prognosis = {
        "risk_level": risk_lv,
        "trajectory": health_trajectory,
        "active_conditions": conditions,
        "monitoring_note": (
            f"Health trajectory is {health_trajectory}. "
            f"{'Conditions require active management.' if conditions else 'No active conditions recorded.'}"
        ),
    }

    # Estate readiness (Gabriel)
    estate = {
        "total_value": estate_value,
        "assets": estate_assets[:10],
        "distribution_ready": len(heirs) > 0 and estate_value > 0,
        "note": (
            f"Estate valued at ${estate_value:,.0f} with {len(estate_assets)} assets. "
            f"{'Distribution plan exists.' if heirs else 'No heirs designated — action needed.'}"
        ),
    }

    # Heir plan (Joseph)
    heir_plan = {
        "heirs": [
            {
                "name": h.get("name", ""),
                "relationship": h.get("relationship", ""),
                "member_id": h.get("member_id", ""),
                "share_percent": h.get("share_percent", round(100 / max(len(heirs), 1))),
            }
            for h in heirs[:10]
        ],
        "total_heirs": len(heirs),
    }

    return {
        "member_id": member_id,
        "member_name": member_name,
        "urgency": urgency,
        "prognosis": prognosis,
        "estate": estate,
        "heir_plan": heir_plan,
        "care_preferences": care_preferences or {},
        "action_items": _build_directive_actions(urgency, prognosis, estate, heir_plan),
        "generated_at": datetime.utcnow().isoformat(),
    }


def _build_directive_actions(urgency, prognosis, estate, heir_plan):
    actions = []
    if urgency in ("high", "moderate"):
        actions.append("Update health directive and share with family members")
    if not estate["distribution_ready"]:
        actions.append("Designate heirs and create estate distribution plan")
    if prognosis["active_conditions"]:
        actions.append(f"Ensure care instructions for: {', '.join(prognosis['active_conditions'][:3])}")
    if heir_plan["total_heirs"] == 0:
        actions.append("Identify and register at least one heir in the family tree")
    return actions


# ─────────────────────────────────────────────────────────────────────────────
# 16. CROSS-SAINT WHAT-IF SIMULATOR (Life decision in 3D)
# ─────────────────────────────────────────────────────────────────────────────

def cross_saint_whatif(
    scenario: str,
    scenario_type: str = "career",
    duration_months: int = 12,
    current_metrics: Optional[Dict[str, float]] = None,
    current_net_worth: float = 0.0,
    monthly_income: float = 0.0,
    family_members: List[Dict[str, Any]] = None,
    ocean_scores: Optional[Dict[str, float]] = None,
) -> Dict[str, Any]:
    """
    Simulate the impact of a life decision across all 3 Saints.
    """
    current_metrics = current_metrics or {"stress": 50, "hrv": 55, "sleep": 7.0}
    family_members = family_members or []
    ocean_scores = ocean_scores or {}

    # Scenario impact modifiers
    impact = _SCENARIO_IMPACTS.get(scenario_type, _SCENARIO_IMPACTS["default"])

    # Raphael projection
    stress_delta = current_metrics.get("stress", 50) * impact["stress_multiplier"]
    hrv_delta = current_metrics.get("hrv", 55) * impact["hrv_multiplier"]
    sleep_delta = current_metrics.get("sleep", 7.0) * impact["sleep_multiplier"]

    raphael_projection = {
        "stress_12mo": round(min(100, stress_delta), 1),
        "hrv_12mo": round(max(10, hrv_delta), 1),
        "sleep_12mo": round(max(3, sleep_delta), 1),
        "health_risk_change": impact["health_risk_label"],
        "narrative": impact["raphael_narrative"].format(months=duration_months),
    }

    # Gabriel projection
    income_change = monthly_income * impact["income_multiplier"]
    healthcare_cost = abs(stress_delta - current_metrics.get("stress", 50)) * 15  # Higher stress = higher cost
    net_worth_12mo = current_net_worth + (income_change * duration_months) - (healthcare_cost * duration_months)

    gabriel_projection = {
        "monthly_income_change": round(income_change - monthly_income, 0),
        "projected_net_worth": round(net_worth_12mo, 0),
        "healthcare_cost_monthly": round(healthcare_cost, 0),
        "narrative": impact["gabriel_narrative"].format(months=duration_months),
    }

    # Joseph projection — family precedent
    similar_ancestors = []
    for m in family_members:
        occupation = str(m.get("occupation", "")).lower()
        if any(kw in occupation for kw in impact.get("occupation_keywords", [])):
            conds = m.get("conditions", m.get("known_conditions", []))
            if isinstance(conds, str):
                conds = [c.strip() for c in conds.split(",") if c.strip()]
            death_year = m.get("deathDate", m.get("death_date"))
            birth_year = m.get("birthYear", m.get("birth_year"))
            lifespan = None
            if death_year and birth_year:
                try:
                    lifespan = int(str(death_year)[:4]) - birth_year
                except (ValueError, TypeError):
                    pass
            similar_ancestors.append({
                "name": f"{m.get('firstName', '')} {m.get('lastName', '')}".strip(),
                "occupation": m.get("occupation", ""),
                "conditions": conds[:3],
                "lifespan": lifespan,
            })

    joseph_projection = {
        "similar_ancestors": similar_ancestors[:5],
        "precedent_found": len(similar_ancestors) > 0,
        "narrative": (
            f"Found {len(similar_ancestors)} family members with similar career paths. "
            + (f"Average lifespan: {sum(a['lifespan'] for a in similar_ancestors if a['lifespan']) / max(len([a for a in similar_ancestors if a['lifespan']]), 1):.0f} years."
               if any(a["lifespan"] for a in similar_ancestors) else "")
        ) if similar_ancestors else "No direct family precedent found for this type of decision.",
    }

    return {
        "scenario": scenario,
        "scenario_type": scenario_type,
        "duration_months": duration_months,
        "projections": {
            "raphael": raphael_projection,
            "gabriel": gabriel_projection,
            "joseph": joseph_projection,
        },
        "overall_recommendation": _whatif_recommendation(raphael_projection, gabriel_projection),
        "generated_at": datetime.utcnow().isoformat(),
    }


_SCENARIO_IMPACTS = {
    "career": {
        "stress_multiplier": 1.35, "hrv_multiplier": 0.88, "sleep_multiplier": 0.92,
        "income_multiplier": 1.40, "health_risk_label": "+15% elevated",
        "raphael_narrative": "High-stress career change: expect stress +35%, HRV -12%, sleep -8% over {months} months.",
        "gabriel_narrative": "Income increases ~40% but healthcare costs rise due to stress-related biometric decline over {months} months.",
        "occupation_keywords": ["manager", "executive", "director", "ceo", "officer", "lead"],
    },
    "relocation": {
        "stress_multiplier": 1.20, "hrv_multiplier": 0.95, "sleep_multiplier": 0.90,
        "income_multiplier": 1.10, "health_risk_label": "+8% temporary",
        "raphael_narrative": "Relocation stress: temporary +20% stress, -5% HRV, -10% sleep over {months} months.",
        "gabriel_narrative": "Relocation may increase income ~10% but involves moving costs and adjustment period over {months} months.",
        "occupation_keywords": ["moved", "relocated", "transferred"],
    },
    "retirement": {
        "stress_multiplier": 0.65, "hrv_multiplier": 1.15, "sleep_multiplier": 1.10,
        "income_multiplier": 0.40, "health_risk_label": "-20% improved",
        "raphael_narrative": "Retirement reduces stress -35%, improves HRV +15% and sleep +10% over {months} months.",
        "gabriel_narrative": "Income drops ~60% but healthcare costs decrease significantly over {months} months.",
        "occupation_keywords": ["retired", "pensioner"],
    },
    "default": {
        "stress_multiplier": 1.10, "hrv_multiplier": 0.95, "sleep_multiplier": 0.97,
        "income_multiplier": 1.05, "health_risk_label": "+5% minor",
        "raphael_narrative": "This life change may mildly increase stress and slightly reduce recovery markers over {months} months.",
        "gabriel_narrative": "Minor financial adjustments expected over {months} months.",
        "occupation_keywords": [],
    },
}


def _whatif_recommendation(raphael, gabriel):
    health_risk = "elevated" in raphael.get("health_risk_change", "")
    net_worth_positive = gabriel.get("projected_net_worth", 0) > gabriel.get("monthly_income_change", 0) * 12
    if health_risk and not net_worth_positive:
        return "Caution: both health and financial projections are unfavorable. Consider a more gradual approach."
    elif health_risk and net_worth_positive:
        return "Financial gain expected, but health markers may decline. Budget for health mitigation strategies."
    elif not health_risk and net_worth_positive:
        return "Favorable outcome projected across all dimensions. Proceed with monitoring."
    else:
        return "Health projections are positive. Financial impact is neutral — maintain current savings discipline."


# ─────────────────────────────────────────────────────────────────────────────
# 17. FAMILY PATTERN REFLECTION (Joseph OCEAN tendencies → reflective blend)
#     Deliberately NOT a Mendelian/Punnett-square genetic predictor. Big Five
#     traits are polygenic and environmentally co-determined — there is no
#     single dominant/recessive allele for a trait like extraversion. This
#     uses regression toward the population mean (the standard behavioral-
#     genetics approximation for how polygenic traits blend across a
#     generation) with a heritability factor drawn from published twin-study
#     meta-analyses (~40-50%, e.g. Vukasović & Bratko 2015; Bouchard & McGue
#     2003). Every output is an illustrative reflection, never a diagnosis or
#     a claim of fact about a real descendant.
# ─────────────────────────────────────────────────────────────────────────────

_TRAIT_KEYS = ("openness", "conscientiousness", "extraversion", "agreeableness", "neuroticism")
_HERITABILITY_FACTOR = 0.45
_POPULATION_MEAN = 50.0

_TRAIT_LABELS = {
    "openness": "Openness",
    "conscientiousness": "Conscientiousness",
    "extraversion": "Extraversion",
    "agreeableness": "Agreeableness",
    "neuroticism": "Emotional Sensitivity",
}

# Narrative context only — these describe documented environmental
# correlates of trait expression. They never modify the numeric blended
# estimate; life experience is not a mathematical "modifier" on inheritance.
_LIFE_EXPERIENCE_NOTES = {
    "significant_loss": "Bereavement and grief often temporarily heighten emotional sensitivity and can lower baseline mood — a well-documented experiential effect, not an inherited trait.",
    "major_achievement": "A major achievement can reinforce confidence and openness to future risk-taking, especially when it happens early in life.",
    "caregiving_role": "Sustained caregiving is associated with higher expressed conscientiousness and agreeableness, alongside elevated stress load.",
    "relocation": "Relocation and cultural adjustment are linked to short-term increases in openness and stress-related emotional sensitivity.",
    "financial_hardship": "Financial hardship is one of the most consistent environmental correlates of elevated emotional sensitivity (stress reactivity) found in longitudinal studies.",
    "health_challenge": "Navigating a personal or family health challenge often shows up as increased vigilance (conscientiousness) and emotional sensitivity.",
    "creative_breakthrough": "Creative breakthroughs tend to correlate with — and reinforce — existing openness rather than create it from nothing.",
    "community_leadership": "Leadership roles are associated with expressed extraversion and conscientiousness, whether or not those were a person's dominant tendencies beforehand.",
}


def family_pattern_reflection(
    member_a_name: str,
    member_a_traits: Dict[str, float],
    member_b_name: str,
    member_b_traits: Dict[str, float],
    life_experiences: Optional[List[Dict[str, Any]]] = None,
) -> Dict[str, Any]:
    """
    Reflective (not predictive) blend of two family members' OCEAN trait
    tendencies, plus an Affective Circumplex (valence/arousal) illustration
    and narrative notes from tagged life experiences.
    """
    life_experiences = life_experiences or []

    a_scores = {k: float(member_a_traits.get(k, _POPULATION_MEAN)) for k in _TRAIT_KEYS}
    b_scores = {k: float(member_b_traits.get(k, _POPULATION_MEAN)) for k in _TRAIT_KEYS}

    blended: Dict[str, float] = {}
    for k in _TRAIT_KEYS:
        mid_parent = (a_scores[k] + b_scores[k]) / 2.0
        estimate = _POPULATION_MEAN + _HERITABILITY_FACTOR * (mid_parent - _POPULATION_MEAN)
        blended[k] = round(max(0.0, min(100.0, estimate)), 1)

    # Affective Circumplex (Russell 1980) — an illustrative overlay derived
    # from the blended traits via documented general-direction correlations,
    # not a separate prediction channel.
    valence = round(max(-1.0, min(1.0, (
        (blended["agreeableness"] - _POPULATION_MEAN) * 0.5
        + (blended["extraversion"] - _POPULATION_MEAN) * 0.2
        - (blended["neuroticism"] - _POPULATION_MEAN) * 0.7
    ) / 50.0)), 2)
    arousal = round(max(-1.0, min(1.0, (
        (blended["extraversion"] - _POPULATION_MEAN) * 0.7
        + (blended["neuroticism"] - _POPULATION_MEAN) * 0.3
    ) / 50.0)), 2)

    experience_notes = []
    for exp in life_experiences:
        tag = exp.get("tag", "")
        note = _LIFE_EXPERIENCE_NOTES.get(tag)
        if note:
            experience_notes.append({
                "tag": tag,
                "member_name": exp.get("member_name", "a family member"),
                "note": note,
            })

    return {
        "member_a_name": member_a_name,
        "member_b_name": member_b_name,
        "blended_tendencies": blended,
        "trait_labels": _TRAIT_LABELS,
        "circumplex": {
            "valence": valence,
            "arousal": arousal,
            "quadrant": _circumplex_quadrant(valence, arousal),
        },
        "experience_notes": experience_notes,
        "methodology_note": (
            "This is a reflective illustration, not a genetic prediction. Personality traits are "
            "polygenic and shaped substantially by environment and life experience — there is no "
            "single dominant or recessive gene for traits like openness or extraversion. The blended "
            "tendencies above use a regression-toward-the-mean estimate (heritability factor ~45%, "
            "consistent with published twin-study ranges), not Mendelian inheritance math."
        ),
        "disclaimer": (
            "Illustrative estimate only — not a diagnosis, clinical prediction, or statement of fact "
            "about any real person's mental or emotional health. Real descendants' personalities are "
            "shaped by countless factors this tool cannot capture."
        ),
        "generated_at": datetime.utcnow().isoformat(),
    }


def _circumplex_quadrant(valence: float, arousal: float) -> str:
    if valence >= 0 and arousal >= 0:
        return "Excited / Engaged"
    if valence >= 0 and arousal < 0:
        return "Calm / Content"
    if valence < 0 and arousal >= 0:
        return "Tense / Stressed"
    return "Fatigued / Withdrawn"
