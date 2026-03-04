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
)

router = APIRouter(prefix="/api/v1/trinity", tags=["Trinity Synapse"])


class TrinitySynapseRequest(BaseModel):
    """Single flexible request model — fields used depend on action."""
    action: str  # "ancestry_priors" | "family_heatmap" | "personality_rx" | "timeline" | "contagion" | "financial_bridge"

    # Common fields
    member_id: Optional[str] = None
    birth_year: Optional[int] = None

    # Ancestry priors
    metrics_history: Optional[List[Dict[str, Any]]] = None
    family_members: Optional[List[Dict[str, Any]]] = None

    # Live heatmap
    members: Optional[List[Dict[str, Any]]] = None
    budget_envelopes: Optional[List[Dict[str, Any]]] = None

    # Personality interventions
    ocean_scores: Optional[Dict[str, float]] = None
    biometrics: Optional[Dict[str, float]] = None
    base_recommendations: Optional[List[str]] = None

    # Generational timeline
    net_worth_history: Optional[List[Dict[str, Any]]] = None
    live_heatmap: Optional[List[Dict[str, Any]]] = None

    # Contagion graph
    relationships: Optional[List[Dict[str, Any]]] = None
    metrics_by_member: Optional[Dict[str, List[Dict[str, Any]]]] = None

    # Financial bridge
    net_worth: Optional[float] = None
    health_risk_score: Optional[float] = None


@router.post("/synapse")
async def trinity_synapse(req: TrinitySynapseRequest) -> Dict[str, Any]:
    """
    Cross-Saint data broker — routes to the correct analysis function.

    Actions:
      ancestry_priors    — Joseph hereditary risk → Raphael prior weights
      family_heatmap     — Raphael live scores → enriched Joseph heatmap
      personality_rx     — Joseph OCEAN profile → Raphael tailored interventions
      timeline           — Full 3-Saint generational timeline
      contagion          — Joseph relationship graph → ContagionEngine analysis
      financial_bridge   — Gabriel spending → health ROI + stress correlation
    """
    action = req.action

    try:
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

        else:
            raise HTTPException(
                status_code=400,
                detail=f"Unknown action '{action}'. Valid: ancestry_priors, family_heatmap, personality_rx, timeline, contagion, financial_bridge"
            )

    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc)) from exc
