from pydantic import BaseModel, Field
from typing import List, Optional, Any
from datetime import datetime
import uuid

class MemoryObject(BaseModel):
    """
    A single unit of memory in the Generative Agent architecture.
    Corresponds to 'Observation' in the paper.
    """
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    description: str
    created_at: datetime = Field(default_factory=datetime.utcnow)
    last_accessed: datetime = Field(default_factory=datetime.utcnow)
    
    # Cognitive Dimensions
    importance: float = 0.0  # 1-10 normalized
    type: str = "observation"  # observation, reflection, plan
    
    # Embedding vector for relevance search (placeholder for now)
    embedding: Optional[List[float]] = None
    
    # Metadata for specific Saint context
    saint_id: Optional[str] = None
    related_entities: List[str] = []

    class Config:
        arbitrary_types_allowed = True
