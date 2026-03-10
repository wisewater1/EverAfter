from fastapi import APIRouter, Depends, HTTPException
from typing import List, Dict, Any
from app.auth.dependencies import get_current_user
from app.services.causal_twin.health_governance_service import health_governance_service

router = APIRouter(prefix="/governance", tags=["Health Governance"])

@router.get("/proposals")
async def list_proposals(
    member_id: str = None,
    current_user: dict = Depends(get_current_user)
):
    """List all governance proposals for the user."""
    user_id = member_id if member_id else current_user.get("id", current_user.get("sub", "demo-user-001"))
    proposals = await health_governance_service.list_proposals(user_id)
    return {"proposals": proposals}

@router.post("/proposals/{proposal_id}/ratify")
async def ratify_proposal(
    proposal_id: str,
    current_user: dict = Depends(get_current_user)
):
    """Ratify a health governance proposal."""
    result = await health_governance_service.ratify_proposal(proposal_id)
    if "error" in result:
        raise HTTPException(status_code=400, detail=result["error"])
    return result

@router.post("/proposals/{proposal_id}/veto")
async def veto_proposal(
    proposal_id: str,
    current_user: dict = Depends(get_current_user)
):
    """Veto a health governance proposal."""
    result = await health_governance_service.veto_proposal(proposal_id)
    if "error" in result:
        raise HTTPException(status_code=400, detail=result["error"])
    return result

@router.post("/check-drift")
async def trigger_governance_check(
    member_id: str = None,
    current_user: dict = Depends(get_current_user)
):
    """Manually trigger a governance cycle check."""
    user_id = member_id if member_id else current_user.get("id", current_user.get("sub", "demo-user-001"))
    await health_governance_service.run_governance_cycle(user_id)
    return {"status": "cycle_complete"}
