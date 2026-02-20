from typing import List, Dict, Any, Optional, Literal
from pydantic import BaseModel, Field
from datetime import datetime
import uuid

# --- Identity & Profile ---

class SaintProfile(BaseModel):
    id: str
    name: str
    role: str
    tier: Literal["free", "premium"] = "free"
    capabilities: List[str] = []
    memory_scope: List[str] = []
    description: str

# --- Collaboration & Missions ---

class MissionStep(BaseModel):
    step_id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    assignee: str # saint_id
    task: str
    status: Literal["pending", "in_progress", "completed", "failed"] = "pending"
    output: Optional[str] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)
    completed_at: Optional[datetime] = None

class EvidenceItem(BaseModel):
    source_agent: str
    memory_id: Optional[str]
    content: str
    confidence: float = 1.0

class Mission(BaseModel):
    mission_id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    title: str
    objective: str
    initiator: str # saint_id
    participants: List[str] = []
    status: Literal["active", "completed", "failed"] = "active"
    steps: List[MissionStep] = []
    evidence: List[EvidenceItem] = []
    final_outcome: Optional[str] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)

# --- Event Bus ---

class AgentEvent(BaseModel):
    event_id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    timestamp: datetime = Field(default_factory=datetime.utcnow)
    type: Literal["message", "mission_created", "step_updated", "mission_completed", "error"]
    sender: str # saint_id
    payload: Dict[str, Any]
