from pydantic import BaseModel, Field
from typing import List, Optional, Literal
from datetime import datetime
import uuid

class Proposal(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    author_id: str
    content: str  # The plan or action proposed
    rationale: str
    created_at: datetime = Field(default_factory=datetime.utcnow)
    version: int = 1

class Critique(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    author_id: str
    proposal_id: str
    content: str
    sentiment: Literal["positive", "negative", "neutral"]
    created_at: datetime = Field(default_factory=datetime.utcnow)

class Vote(BaseModel):
    author_id: str
    proposal_id: str
    decision: Literal["accept", "reject", "abstain"]
    reasoning: Optional[str] = None

class ConsensusSession(BaseModel):
    """
    Represents a single deliberation session (e.g. for a specific mission step).
    Follows: Proposal -> Critique -> Refinement -> Vote
    """
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    mission_id: str
    topic: str
    status: Literal["active", "consensus_reached", "failed"] = "active"
    
    current_proposal: Optional[Proposal] = None
    history_proposals: List[Proposal] = []
    critiques: List[Critique] = []
    votes: List[Vote] = []
    
    participants: List[str] = []
    required_votes: int = 2
