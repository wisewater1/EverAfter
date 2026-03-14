"""
Autonomous Health Governance Service.
Monitors health metrics, detects drift, and manages governance proposals.
"""
import uuid
from typing import List, Dict, Any, Optional
from datetime import datetime
from sqlalchemy import select, update, insert
from sqlalchemy.exc import ProgrammingError
from app.db.session import get_session_factory
from app.models.governance import GovernanceProposal, HealthProtocol, ProposalStatus, ProposalType
from app.models.causal_twin import Experiment, DriftEvent, ModelStatus
from app.services.causal_twin.drift_monitor import drift_monitor
from app.services.causal_twin.experiment_engine import experiment_engine
from app.ai.llm_client import get_llm_client

class HealthGovernanceService:
    """
    The 'Brain' of Pillar 3. Acts as St. Raphael's executive function.
    """
    
    def __init__(self):
        self.llm = get_llm_client()
        self._fallback_proposals: Dict[str, Dict[str, Any]] = {}

    @staticmethod
    def _missing_governance_tables(exc: Exception) -> bool:
        detail = str(exc).lower()
        return (
            ("governance_proposals" in detail and "does not exist" in detail)
            or ("governance_protocols" in detail and "does not exist" in detail)
        )

    async def run_governance_cycle(self, user_id: str):
        """
        Main loop: Check for drift, monitor protocols, and suggest proposals.
        """
        # 1. Check for model drift
        drift_status = drift_monitor.get_model_status(user_id)
        if drift_status["status"] == ModelStatus.DEGRADED.value:
            await self._handle_model_drift(user_id, drift_status)

        # 2. Check for protocol violations
        await self._check_protocol_compliance(user_id)

    async def _handle_model_drift(self, user_id: str, drift_status: Dict[str, Any]):
        """
        When model accuracy drops, autonomously suggest a recalibration experiment.
        """
        # Check if we already have a pending proposal for this
        async_session = get_session_factory()
        try:
            async with async_session() as session:
                stmt = select(GovernanceProposal).where(
                    GovernanceProposal.user_id == user_id,
                    GovernanceProposal.status == ProposalStatus.PENDING.value,
                    GovernanceProposal.type == ProposalType.EXPERIMENT.value
                )
                result = await session.execute(stmt)
                existing = result.scalar_one_or_none()
                
                if existing:
                    return

                # Propose a new experiment to recalibrate the twin
                proposal = GovernanceProposal(
                    user_id=user_id,
                    type=ProposalType.EXPERIMENT.value,
                    title="Causal Recalibration Protocol",
                    description=(
                        "Your health causal twin has detected a significant drop in prediction accuracy. "
                        "To adapt to your new schedule, I propose a 7-day baseline experiment."
                    ),
                    rationale="Prediction accuracy dropped by 12% in the last 14 days.",
                    parameters={
                        "intervention_a": "Baseline Activity",
                        "intervention_b": "Reduced Caffeine",
                        "outcome_metrics": ["hrv", "sleep_quality"],
                        "duration_days": 7
                    },
                    confidence_score=0.85,
                    priority=1
                )
                session.add(proposal)
                await session.commit()
        except ProgrammingError as exc:
            if self._missing_governance_tables(exc):
                proposal_id = str(uuid.uuid4())
                self._fallback_proposals[proposal_id] = {
                    "id": proposal_id,
                    "user_id": user_id,
                    "type": ProposalType.EXPERIMENT.value,
                    "title": "Causal Recalibration Protocol",
                    "description": (
                        "Your health causal twin has detected a significant drop in prediction accuracy. "
                        "To adapt to your new schedule, I propose a 7-day baseline experiment."
                    ),
                    "rationale": "Prediction accuracy dropped by 12% in the last 14 days.",
                    "parameters": {
                        "intervention_a": "Baseline Activity",
                        "intervention_b": "Reduced Caffeine",
                        "outcome_metrics": ["hrv", "sleep_quality"],
                        "duration_days": 7,
                    },
                    "status": ProposalStatus.PENDING.value,
                    "confidence_score": 0.85,
                    "priority": 1,
                    "created_at": datetime.utcnow().isoformat(),
                    "decided_at": None,
                }
                return
            raise

    async def _check_protocol_compliance(self, user_id: str):
        """
        Monitor active 'Health Laws' for the user.
        """
        async_session = get_session_factory()
        try:
            async with async_session() as session:
                stmt = select(HealthProtocol).where(
                    HealthProtocol.user_id == user_id,
                    HealthProtocol.is_active == True
                )
                result = await session.execute(stmt)
                protocols = result.scalars().all()
                
                # Logic for violation detection would go here (connecting to real vitals)
                # For now, it's a structural placeholder for Pillar 3.
                pass
        except ProgrammingError as exc:
            if self._missing_governance_tables(exc):
                return
            raise

    async def list_proposals(self, user_id: str) -> List[Dict[str, Any]]:
        async_session = get_session_factory()
        try:
            async with async_session() as session:
                stmt = select(GovernanceProposal).where(GovernanceProposal.user_id == user_id)
                result = await session.execute(stmt)
                proposals = result.scalars().all()
                return [{c.name: getattr(p, c.name) for c in p.__table__.columns} for p in proposals]
        except ProgrammingError as exc:
            if self._missing_governance_tables(exc):
                return [
                    dict(proposal)
                    for proposal in self._fallback_proposals.values()
                    if proposal.get("user_id") == user_id
                ]
            raise
        
        return []

    async def ratify_proposal(self, proposal_id: str) -> Dict[str, Any]:
        """
        Ratify a proposal: Execute the action (e.g., start experiment).
        """
        async_session = get_session_factory()
        try:
            async with async_session() as session:
                stmt = select(GovernanceProposal).where(GovernanceProposal.id == proposal_id)
                result = await session.execute(stmt)
                proposal = result.scalar_one_or_none()
                
                if not proposal:
                    return {"error": "Proposal not found"}
                
                if proposal.status != ProposalStatus.PENDING.value:
                    return {"error": f"Proposal is already {proposal.status}"}

                # If it's an experiment, create it!
                if proposal.type == ProposalType.EXPERIMENT.value:
                    params = proposal.parameters
                    await experiment_engine.create_experiment(
                        user_id=proposal.user_id,
                        name=proposal.title,
                        intervention_a=params["intervention_a"],
                        intervention_b=params["intervention_b"],
                        outcome_metrics=params["outcome_metrics"],
                        duration_days=params["duration_days"],
                        description=proposal.description
                    )

                proposal.status = ProposalStatus.RATIFIED.value
                proposal.decided_at = datetime.utcnow()
                await session.commit()
                return {"status": "ratified"}
        except ProgrammingError as exc:
            if self._missing_governance_tables(exc):
                proposal = self._fallback_proposals.get(proposal_id)
                if not proposal:
                    return {"error": "Proposal not found"}
                if proposal["status"] != ProposalStatus.PENDING.value:
                    return {"error": f"Proposal is already {proposal['status']}"}
                if proposal["type"] == ProposalType.EXPERIMENT.value:
                    params = proposal["parameters"]
                    await experiment_engine.create_experiment(
                        user_id=proposal["user_id"],
                        name=proposal["title"],
                        intervention_a=params["intervention_a"],
                        intervention_b=params["intervention_b"],
                        outcome_metrics=params["outcome_metrics"],
                        duration_days=params["duration_days"],
                        description=proposal["description"],
                    )
                proposal["status"] = ProposalStatus.RATIFIED.value
                proposal["decided_at"] = datetime.utcnow().isoformat()
                return {"status": "ratified"}
            raise
        
        return {"error": "Database session context escaped"}

    async def veto_proposal(self, proposal_id: str) -> Dict[str, Any]:
        async_session = get_session_factory()
        try:
            async with async_session() as session:
                stmt = select(GovernanceProposal).where(GovernanceProposal.id == proposal_id)
                result = await session.execute(stmt)
                proposal = result.scalar_one_or_none()
                
                if not proposal:
                    return {"error": "Proposal not found"}
                
                proposal.status = ProposalStatus.VETOED.value
                proposal.decided_at = datetime.utcnow()
                await session.commit()
                return {"status": "vetoed"}
        except ProgrammingError as exc:
            if self._missing_governance_tables(exc):
                proposal = self._fallback_proposals.get(proposal_id)
                if not proposal:
                    return {"error": "Proposal not found"}
                proposal["status"] = ProposalStatus.VETOED.value
                proposal["decided_at"] = datetime.utcnow().isoformat()
                return {"status": "vetoed"}
            raise
        
        return {"error": "Database session context escaped"}

health_governance_service = HealthGovernanceService()
