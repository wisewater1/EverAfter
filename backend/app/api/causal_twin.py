"""
API Routes for Health Causal Twin.
Exposes counterfactual simulation, experiments, evidence ledger,
model health, and next-best-measurement recommendations.
"""
from fastapi import APIRouter, Depends, HTTPException, status
from typing import Dict, Any, List, Optional
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.api.auth_utils import get_current_user_id
from app.db.session import get_async_session
from app.auth.dependencies import get_current_user
from app.services.causal_twin.counterfactual_engine import counterfactual_engine
from app.services.causal_twin.experiment_engine import experiment_engine
from app.services.causal_twin.evidence_ledger import evidence_ledger
from app.services.causal_twin.drift_monitor import drift_monitor
from app.services.causal_twin.measurement_recommender import measurement_recommender
from app.services.causal_twin.safety_guardrails import safety_guardrails
from app.services.causal_twin.ancestry_engine import ancestry_engine
from app.models.health import Metric
from app.schemas.causal_twin import (
    SimulationRequest, ExperimentCreate, AdherenceLog, ExperimentUpdate
)

router = APIRouter(prefix="/api/v1/causal-twin", tags=["causal-twin"])


async def _resolve_requested_user_id(current_user: dict, member_id: Optional[str] = None) -> str:
    return member_id or await get_current_user_id(current_user)


async def _derive_measurement_context(session: AsyncSession, user_id: str) -> Dict[str, List[str]]:
    available_data: set[str] = set()
    weak_predictions: set[str] = set()
    metric_types: set[str] = set()

    try:
        metric_result = await session.execute(
            select(Metric.type).where(Metric.sourceId == user_id).distinct()
        )
        metric_types = {str(value).upper() for value in metric_result.scalars().all() if value}
    except Exception:
        metric_types = set()

    if "GLUCOSE" in metric_types:
        available_data.add("cgm_trial")
    else:
        weak_predictions.add("glucose_variability")

    if "HRV" in metric_types:
        available_data.add("hrv_wearable")
    else:
        weak_predictions.update({"hrv", "recovery_score"})

    if "SLEEP_DURATION" in metric_types or "SLEEP_STAGE" in metric_types:
        available_data.add("sleep_journal")
    else:
        weak_predictions.add("sleep_quality")

    if "HEART_RATE" not in metric_types:
        weak_predictions.add("resting_hr")

    try:
        family_map = await ancestry_engine.get_family_health_map_for_user(user_id)
        if family_map:
            family_risk_levels = {str(item.get("risk_level", "")).lower() for item in family_map}
            if family_risk_levels.intersection({"high", "critical"}):
                weak_predictions.update({"energy", "recovery_score"})
    except Exception:
        pass

    if not weak_predictions:
        weak_predictions.update({"energy", "mood"})

    return {
        "available_data": sorted(available_data),
        "weak_predictions": sorted(weak_predictions),
    }


# ============================================================
# CAUSAL ANCESTRY
# ============================================================

class AncestryMemberRequest(BaseModel):
    member_id: str
    first_name: str
    last_name: str
    traits: List[str] = []
    birth_year: Optional[int] = None
    occupation: Optional[str] = None
    generation: int = 1


class FamilyMapRequest(BaseModel):
    members: List[Dict[str, Any]]


@router.post("/ancestry/predict")
async def predict_ancestry_trajectory(
    request: AncestryMemberRequest,
    current_user: dict = Depends(get_current_user)
):
    """Predict 10/20/30 year health trajectory for a family member."""
    result = await ancestry_engine.predict_member_trajectory(
        member_id=request.member_id,
        first_name=request.first_name,
        last_name=request.last_name,
        traits=request.traits,
        birth_year=request.birth_year,
        occupation=request.occupation,
        generation=request.generation,
    )
    return result


@router.get("/ancestry/family-map")
async def get_family_health_map(
    current_user: dict = Depends(get_current_user)
):
    """Generate a risk colour heat-map for all living family members from the database."""
    user_id = await get_current_user_id(current_user)
    result = await ancestry_engine.get_family_health_map_for_user(user_id)
    return {"family_map": result, "total": len(result)}


# ============================================================
# COUNTERFACTUAL SIMULATION
# ============================================================

from fastapi import APIRouter, Depends, HTTPException, status, Query

@router.post("/simulate")
async def simulate_scenario(
    request: SimulationRequest,
    member_id: Optional[str] = Query(None),
    current_user: dict = Depends(get_current_user)
):
    """Run a 'What If' counterfactual simulation for the user or a specific family member."""
    user_id = await _resolve_requested_user_id(current_user, member_id)
    
    # Run simulation (engine now handles internal stats fetching)
    result = await counterfactual_engine.simulate_scenarios(
        user_id=user_id,
        behavior_changes=request.behavior_changes,
        target_metrics=request.target_metrics,
        horizons=request.horizons
    )
    return result


@router.get("/predictions")
async def get_active_predictions(
    member_id: Optional[str] = Query(None),
    current_user: dict = Depends(get_current_user)
):
    """Get current active predictions for the user or a specific family member."""
    user_id = await _resolve_requested_user_id(current_user, member_id)

    # Generate a default prediction set if none exist (default activity)
    default = await counterfactual_engine.simulate_scenarios(
        user_id=user_id,
        behavior_changes={"sleep_hours": 7.5, "steps": 8000}
    )
    return {"predictions": [default]}


# ============================================================
# EXPERIMENTS
# ============================================================

@router.post("/experiments")
async def create_experiment(
    request: ExperimentCreate,
    member_id: Optional[str] = Query(None),
    current_user: dict = Depends(get_current_user)
):
    """Create a new N-of-1 experiment."""
    user_id = await _resolve_requested_user_id(current_user, member_id)
    result = await experiment_engine.create_experiment(
        user_id=user_id,
        name=request.name,
        intervention_a=request.intervention_a,
        intervention_b=request.intervention_b,
        outcome_metrics=request.outcome_metrics,
        duration_days=request.duration_days,
        description=request.description
    )
    if not result.get("created"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=result.get("error", "Failed to create experiment")
        )
    return result


@router.get("/experiments")
async def list_experiments(
    member_id: Optional[str] = Query(None),
    current_user: dict = Depends(get_current_user)
):
    """List all experiments for the current user."""
    user_id = await _resolve_requested_user_id(current_user, member_id)
    experiments = await experiment_engine.list_experiments(user_id)
    return {"experiments": experiments}


@router.get("/experiments/{experiment_id}")
async def get_experiment(
    experiment_id: str,
    current_user: dict = Depends(get_current_user)
):
    """Get experiment details and results."""
    exp = await experiment_engine.get_experiment(experiment_id)
    if not exp:
        raise HTTPException(status_code=404, detail="Experiment not found")
    return exp


@router.post("/experiments/{experiment_id}/adherence")
async def log_adherence(
    experiment_id: str,
    log: AdherenceLog,
    current_user: dict = Depends(get_current_user)
):
    """Log daily adherence for an experiment."""
    result = await experiment_engine.log_adherence(
        experiment_id=experiment_id,
        day_number=log.day_number,
        adhered=log.adhered,
        metric_values=log.metric_values,
        notes=log.notes
    )
    if "error" in result:
        raise HTTPException(status_code=400, detail=result["error"])
    return result


@router.patch("/experiments/{experiment_id}")
async def update_experiment(
    experiment_id: str,
    update: ExperimentUpdate,
    current_user: dict = Depends(get_current_user)
):
    """Start, pause, resume, or complete an experiment."""
    actions = {
        "start": experiment_engine.start_experiment,
        "pause": experiment_engine.pause_experiment,
        "resume": experiment_engine.resume_experiment,
        "complete": experiment_engine.complete_experiment,
    }
    action_fn = actions.get(update.action)
    if not action_fn:
        raise HTTPException(status_code=400, detail=f"Unknown action: {update.action}")

    result = await action_fn(experiment_id)
    if "error" in result:
        raise HTTPException(status_code=400, detail=result["error"])
    return result


# ============================================================
# EVIDENCE LEDGER
# ============================================================

@router.get("/evidence")
async def get_evidence_trail(
    evidence_type: Optional[str] = None,
    limit: int = 50,
    member_id: Optional[str] = Query(None),
    current_user: dict = Depends(get_current_user)
):
    """Get the recommendation evidence audit trail."""
    user_id = await _resolve_requested_user_id(current_user, member_id)

    entries = evidence_ledger.get_audit_trail(
        user_id=user_id, limit=limit, evidence_type=evidence_type
    )

    # If empty, seed with demo data
    if not entries:
        entries = await _seed_demo_evidence(user_id)

    quality = evidence_ledger.compare_quality_over_time(user_id)
    return {"entries": entries, "quality_trend": quality}


@router.get("/evidence/{entry_id}")
async def get_evidence_detail(
    entry_id: str,
    current_user: dict = Depends(get_current_user)
):
    """'Why this recommendation?' drill-down view."""
    detail = evidence_ledger.get_entry_detail(entry_id)
    if not detail:
        raise HTTPException(status_code=404, detail="Evidence entry not found")
    return detail


# ============================================================
# MODEL HEALTH / DRIFT
# ============================================================

@router.get("/model-health")
async def get_model_health(
    member_id: Optional[str] = Query(None),
    current_user: dict = Depends(get_current_user)
):
    """Get drift status, accuracy trend, and model state."""
    user_id = await _resolve_requested_user_id(current_user, member_id)
    model_status = drift_monitor.get_model_status(user_id)
    drift_history = drift_monitor.get_drift_history(user_id)
    return {
        "model_status": model_status,
        "drift_history": drift_history
    }


# ============================================================
# NEXT BEST MEASUREMENT
# ============================================================

@router.get("/next-measurements")
async def get_next_measurements(
    member_id: Optional[str] = Query(None),
    current_user: dict = Depends(get_current_user),
    session: AsyncSession = Depends(get_async_session)
):
    """Get prioritized measurement recommendations."""
    user_id = await _resolve_requested_user_id(current_user, member_id)
    measurement_context = await _derive_measurement_context(session, user_id)
    recommendations = measurement_recommender.rank_measurements(
        user_id=user_id,
        available_data=measurement_context["available_data"],
        weak_predictions=measurement_context["weak_predictions"],
        limit=5
    )

    disclaimer = safety_guardrails.get_wellness_disclaimer()
    return {
        "recommendations": recommendations,
        "measurement_context": measurement_context,
        "disclaimer": disclaimer
    }


# ============================================================
# HELPERS
# ============================================================

async def _seed_demo_evidence(user_id: str) -> list:
    """Seed demo evidence entries for first-time users."""
    demos = [
        {
            "text": "Maintain consistent sleep schedules to improve HRV",
            "sources": ["wearable:fitbit", "journal:sleep"],
            "confidence": 78.0,
            "evidence": "strong_correlation"
        },
        {
            "text": "Light activity after dinner helps flatten the glucose curve",
            "sources": ["wearable:fitbit", "journal:nutrition"],
            "confidence": 62.0,
            "evidence": "weak_correlation"
        },
        {
            "text": "Stay hydrated during afternoon to prevent fatigue spikes",
            "sources": ["journal:mood", "population_research"],
            "confidence": 45.0,
            "evidence": "population_prior"
        }
    ]
    entries = []
    for d in demos:
        entry = await evidence_ledger.record_recommendation(
            user_id=user_id,
            recommendation_text=d["text"],
            data_sources=d["sources"],
            confidence=d["confidence"],
            evidence_type=d["evidence"]
        )
        entries.append(entry)
    return entries
