import logging
import uuid
from typing import Dict, List, Optional
from datetime import datetime

from app.schemas.saint_runtime import Mission, MissionStep, EvidenceItem
from app.services.agent_bus import agent_bus, AgentEvent

logger = logging.getLogger(__name__)

class MissionBoard:
    """
    The Shared Blackboard for Agentic Collaboration.
    Stores the state of all active missions and coordinates updates via the AgentBus.
    """
    def __init__(self):
        # In-memory storage for prototype; Phase 3 moves this to DB
        self._missions: Dict[str, Mission] = {}

    async def create_mission(
        self, 
        title: str, 
        objective: str, 
        initiator_id: str
    ) -> Mission:
        """Initialize a new mission."""
        mission = Mission(
            title=title, 
            objective=objective, 
            initiator=initiator_id,
            participants=[initiator_id]
        )
        self._missions[mission.mission_id] = mission
        
        logger.info(f"MissionBoard: Created mission {mission.mission_id} by {initiator_id}")
        
        # Broadcast creation
        await agent_bus.publish(AgentEvent(
            type="mission_created",
            sender="mission_board",
            payload={"mission_id": mission.mission_id, "mission": mission.dict()}
        ))
        
        return mission

    def get_mission(self, mission_id: str) -> Optional[Mission]:
        return self._missions.get(mission_id)

    async def add_step(self, mission_id: str, assignee: str, task: str) -> Optional[MissionStep]:
        """Add a planned step to a mission."""
        mission = self.get_mission(mission_id)
        if not mission:
            return None

        step = MissionStep(assignee=assignee, task=task)
        mission.steps.append(step)
        
        if assignee not in mission.participants:
            mission.participants.append(assignee)
            
        mission.updated_at = datetime.utcnow()
        
        await agent_bus.publish(AgentEvent(
            type="step_updated",
            sender="mission_board",
            payload={"mission_id": mission_id, "step_id": step.step_id, "status": "pending"}
        ))
        
        return step

    async def update_step(
        self, 
        mission_id: str, 
        step_id: str, 
        status: str, 
        output: Optional[str] = None
    ) -> bool:
        """Update the status/output of a mission step."""
        mission = self.get_mission(mission_id)
        if not mission:
            return False

        for step in mission.steps:
            if step.step_id == step_id:
                step.status = status
                if output:
                    step.output = output
                step.completed_at = datetime.utcnow() if status == "completed" else None
                
                mission.updated_at = datetime.utcnow()
                
                await agent_bus.publish(AgentEvent(
                    type="step_updated",
                    sender="mission_board",
                    payload={
                        "mission_id": mission_id, 
                        "step_id": step_id, 
                        "status": status,
                        "output": output
                    }
                ))
                
                # Check for mission completion
                await self._check_mission_completion(mission)
                return True
                
        return False
        
    async def add_evidence(self, mission_id: str, evidence: EvidenceItem):
        """Attach evidence/memory to the mission."""
        mission = self.get_mission(mission_id)
        if mission:
            mission.evidence.append(evidence)
            mission.updated_at = datetime.utcnow()

    async def _check_mission_completion(self, mission: Mission):
        """Internal check to see if all steps are done."""
        if not mission.steps:
            return

        all_complete = all(s.status == "completed" for s in mission.steps)
        if all_complete and mission.status != "completed":
            mission.status = "completed"
            await agent_bus.publish(AgentEvent(
                type="mission_completed",
                sender="mission_board",
                payload={"mission_id": mission.mission_id}
            ))

# Singleton
mission_board = MissionBoard()
