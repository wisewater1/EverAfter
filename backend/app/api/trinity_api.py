"""
Trinity Synapse API
===================
Single REST endpoint routing all cross-Saint analysis actions.
POST /api/v1/trinity/synapse
"""

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Any, Dict, List, Optional

from app.services.trinity_synapse import (
    ancestry_priors,
    live_family_heatmap,
    personality_interventions,
    generational_timeline,
    contagion_graph,
    financial_health_bridge,
    # Options 1-10
    trinity_council,
    cross_saint_goal,
    family_vitality_score,
    emergency_alert_chain,
    seasonal_calendar,
    family_chronicle,
    elder_care_plan,
    behavioral_nudge,
    inheritance_directive,
    cross_saint_whatif,
)

router = APIRouter(prefix="/api/v1/trinity", tags=["Trinity Synapse"])


class TrinitySynapseRequest(BaseModel):
    """Single flexible request model — fields used depend on action."""
    action: str

    # Common fields
    member_id: Optional[str] = None
    member_name: Optional[str] = None
    birth_year: Optional[int] = None

    # Ancestry priors / shared
    metrics_history: Optional[List[Dict[str, Any]]] = None
    family_members: Optional[List[Dict[str, Any]]] = None
    members: Optional[List[Dict[str, Any]]] = None
    budget_envelopes: Optional[List[Dict[str, Any]]] = None

    # Personality / OCEAN
    ocean_scores: Optional[Dict[str, float]] = None
    biometrics: Optional[Dict[str, float]] = None
    base_recommendations: Optional[List[str]] = None

    # Timeline
    net_worth_history: Optional[List[Dict[str, Any]]] = None
    live_heatmap: Optional[List[Dict[str, Any]]] = None

    # Contagion
    relationships: Optional[List[Dict[str, Any]]] = None
    metrics_by_member: Optional[Dict[str, List[Dict[str, Any]]]] = None

    # Financial bridge
    net_worth: Optional[float] = None
    health_risk_score: Optional[float] = None

    # Trinity Council (Option 1)
    user_message: Optional[str] = None

    # Cross-Saint Goal (Option 2)
    goal_name: Optional[str] = None
    goal_type: Optional[str] = None
    health_target: Optional[Dict[str, Any]] = None
    budget_allocation: Optional[Dict[str, Any]] = None
    family_tracking: Optional[List[str]] = None

    # Family Vitality Score (Option 3)
    monthly_income: Optional[float] = None

    # Emergency Alert (Option 4)
    critical_metric: Optional[str] = None
    critical_value: Optional[float] = None

    # Seasonal Calendar (Option 5)
    transaction_history: Optional[List[Dict[str, Any]]] = None

    # Family Chronicle (Option 6)
    health_milestones: Optional[List[Dict[str, Any]]] = None
    financial_milestones: Optional[List[Dict[str, Any]]] = None

    # Elder Care (Option 7) — uses metrics_by_member, budget_envelopes, monthly_income

    # Behavioral Nudge (Option 8)
    current_stress: Optional[float] = None
    current_hrv: Optional[float] = None
    budget_pressure: Optional[float] = None
    overspent_categories: Optional[List[str]] = None
    time_of_day: Optional[str] = None

    # Inheritance Directive (Option 9)
    health_trajectory: Optional[str] = None
    conditions: Optional[List[str]] = None
    estate_value: Optional[float] = None
    estate_assets: Optional[List[Dict[str, Any]]] = None
    heirs: Optional[List[Dict[str, Any]]] = None
    care_preferences: Optional[Dict[str, Any]] = None

    # Cross-Saint What-If (Option 10)
    scenario: Optional[str] = None
    scenario_type: Optional[str] = None
    duration_months: Optional[int] = None
    current_metrics: Optional[Dict[str, float]] = None


_VALID_ACTIONS = (
    "ancestry_priors, family_heatmap, personality_rx, timeline, contagion, "
    "financial_bridge, trinity_council, cross_saint_goal, family_vitality, "
    "emergency_alert, seasonal_calendar, family_chronicle, elder_care, "
    "behavioral_nudge, inheritance_directive, cross_saint_whatif"
)


@router.post("/synapse")
async def trinity_synapse(req: TrinitySynapseRequest) -> Dict[str, Any]:
    """
    Cross-Saint data broker — routes to the correct analysis function.
    Supports 16 actions across all three Saints.
    """
    action = req.action

    try:
        # ── Original 6 actions ──────────────────────────────────────────
        if action == "ancestry_priors":
            return ancestry_priors(
                member_id=req.member_id or "unknown",
                birth_year=req.birth_year,
                metrics_history=req.metrics_history or [],
                family_members=req.family_members or [],
            )

        elif action == "family_heatmap":
            return live_family_heatmap(
                members=req.members or req.family_members or [],
                budget_envelopes=req.budget_envelopes,
            )

        elif action == "personality_rx":
            return personality_interventions(
                ocean_scores=req.ocean_scores or {},
                biometrics=req.biometrics or {},
                base_recommendations=req.base_recommendations or [],
            )

        elif action == "timeline":
            return generational_timeline(
                family_members=req.family_members or req.members or [],
                live_heatmap=req.live_heatmap,
                net_worth_history=req.net_worth_history,
            )

        elif action == "contagion":
            return contagion_graph(
                family_members=req.family_members or req.members or [],
                relationships=req.relationships or [],
                metrics_by_member=req.metrics_by_member or {},
            )

        elif action == "financial_bridge":
            return financial_health_bridge(
                member_id=req.member_id or "unknown",
                budget_envelopes=req.budget_envelopes or [],
                metrics_history=req.metrics_history or [],
                net_worth=req.net_worth or 0.0,
                health_risk_score=req.health_risk_score or 50.0,
            )

        # ── Option 1: Trinity Council ───────────────────────────────────
        elif action == "trinity_council":
            return trinity_council(
                user_message=req.user_message or "",
                member_id=req.member_id or "user",
                family_members=req.family_members or [],
                metrics_history=req.metrics_history or [],
                budget_envelopes=req.budget_envelopes or [],
                ocean_scores=req.ocean_scores,
            )

        # ── Option 2: Cross-Saint Goal ──────────────────────────────────
        elif action == "cross_saint_goal":
            return cross_saint_goal(
                goal_name=req.goal_name or "Untitled Goal",
                goal_type=req.goal_type or "health",
                health_target=req.health_target,
                budget_allocation=req.budget_allocation,
                family_tracking=req.family_tracking,
                metrics_history=req.metrics_history or [],
                budget_envelopes=req.budget_envelopes or [],
            )

        # ── Option 3: Family Vitality Score ─────────────────────────────
        elif action == "family_vitality":
            return family_vitality_score(
                family_members=req.family_members or [],
                metrics_history=req.metrics_history or [],
                budget_envelopes=req.budget_envelopes or [],
                net_worth=req.net_worth or 0.0,
                monthly_income=req.monthly_income or 0.0,
            )

        # ── Option 4: Emergency Alert Chain ─────────────────────────────
        elif action == "emergency_alert":
            return emergency_alert_chain(
                member_id=req.member_id or "user",
                critical_metric=req.critical_metric or "stress_level",
                critical_value=req.critical_value or 80.0,
                metrics_history=req.metrics_history or [],
                budget_envelopes=req.budget_envelopes or [],
                family_members=req.family_members or [],
            )

        # ── Option 5: Seasonal Calendar ─────────────────────────────────
        elif action == "seasonal_calendar":
            return seasonal_calendar(
                family_members=req.family_members or [],
                metrics_history=req.metrics_history or [],
                budget_envelopes=req.budget_envelopes or [],
                transaction_history=req.transaction_history or [],
            )

        # ── Option 6: Family Chronicle ──────────────────────────────────
        elif action == "family_chronicle":
            return family_chronicle(
                family_members=req.family_members or [],
                health_milestones=req.health_milestones or [],
                financial_milestones=req.financial_milestones or [],
            )

        # ── Option 7: Elder Care Coordination ───────────────────────────
        elif action == "elder_care":
            return elder_care_plan(
                family_members=req.family_members or [],
                metrics_by_member=req.metrics_by_member or {},
                budget_envelopes=req.budget_envelopes or [],
                monthly_income=req.monthly_income or 0.0,
            )

        # ── Option 8: Behavioral Nudge ──────────────────────────────────
        elif action == "behavioral_nudge":
            return behavioral_nudge(
                ocean_scores=req.ocean_scores,
                current_stress=req.current_stress or 50.0,
                current_hrv=req.current_hrv or 50.0,
                budget_pressure=req.budget_pressure or 0.0,
                overspent_categories=req.overspent_categories or [],
                time_of_day=req.time_of_day or "morning",
            )

        # ── Option 9: Inheritance Directive ─────────────────────────────
        elif action == "inheritance_directive":
            return inheritance_directive(
                member_id=req.member_id or "user",
                member_name=req.member_name or "",
                health_risk_score=req.health_risk_score or 50.0,
                health_trajectory=req.health_trajectory or "stable",
                conditions=req.conditions or [],
                estate_value=req.estate_value or 0.0,
                estate_assets=req.estate_assets or [],
                heirs=req.heirs or [],
                care_preferences=req.care_preferences,
            )

        # ── Option 10: Cross-Saint What-If ──────────────────────────────
        elif action == "cross_saint_whatif":
            return cross_saint_whatif(
                scenario=req.scenario or "Unspecified scenario",
                scenario_type=req.scenario_type or "default",
                duration_months=req.duration_months or 12,
                current_metrics=req.current_metrics,
                current_net_worth=req.net_worth or 0.0,
                monthly_income=req.monthly_income or 0.0,
                family_members=req.family_members or [],
                ocean_scores=req.ocean_scores,
            )

        else:
            raise HTTPException(
                status_code=400,
                detail=f"Unknown action '{action}'. Valid: {_VALID_ACTIONS}"
            )

    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc)) from exc
