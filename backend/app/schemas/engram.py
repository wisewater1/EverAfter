from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any
from datetime import datetime
from uuid import UUID


class EngramBase(BaseModel):
    name: str
    relationship: str
    engram_type: str = Field(..., pattern="^(family_member|custom)$")
    email: Optional[str] = None
    description: Optional[str] = ""
    avatar_url: Optional[str] = None


class EngramCreate(EngramBase):
    user_id: UUID


class EngramResponse(EngramBase):
    id: UUID
    user_id: UUID
    personality_summary: Dict[str, Any] = {}
    total_questions_answered: int = 0
    ai_readiness_score: int = 0
    is_ai_active: bool = False
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class EngramUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    avatar_url: Optional[str] = None
    is_ai_active: Optional[bool] = None


class ResponseCreate(BaseModel):
    engram_id: UUID
    question_text: str
    response_text: str
    question_category: str
    day_number: int
    mood: Optional[str] = None


class ResponseResponse(BaseModel):
    id: UUID
    engram_id: UUID
    user_id: UUID
    question_text: str
    response_text: str
    question_category: str
    day_number: int
    mood: Optional[str] = None
    personality_tags: List[Dict[str, Any]] = []
    embedding_generated: bool = False
    created_at: datetime

    class Config:
        from_attributes = True


class PersonalityAnalysisResponse(BaseModel):
    total_responses: int
    categories_covered: List[str]
    personality_summary: Dict[str, Any]
    traits: List[Dict[str, Any]]
    ai_readiness_score: int


class ChatMessageCreate(BaseModel):
    content: str


class ChatMessageResponse(BaseModel):
    id: UUID
    conversation_id: UUID
    role: str
    content: str
    created_at: datetime

    class Config:
        from_attributes = True


class ConversationResponse(BaseModel):
    id: UUID
    engram_id: UUID
    user_id: UUID
    title: str
    created_at: datetime
    updated_at: datetime
    messages: List[ChatMessageResponse] = []

    class Config:
        from_attributes = True


class TaskCreate(BaseModel):
    task_name: str
    task_description: str
    task_type: str = Field(..., pattern="^(appointment|reminder|communication|research|custom)$")
    frequency: str = Field(default="on_demand", pattern="^(daily|weekly|monthly|on_demand)$")
    is_active: bool = True


class TaskResponse(BaseModel):
    id: UUID
    engram_id: UUID
    task_name: str
    task_description: str
    task_type: str
    frequency: str
    is_active: bool
    last_executed: Optional[datetime] = None
    execution_log: List[Dict[str, Any]] = []
    created_at: datetime

    class Config:
        from_attributes = True


class EngramAssetBase(BaseModel):
    asset_type: str = Field(..., pattern="^(photo|video|voice_note|custom)$")
    file_url: str
    description: Optional[str] = None


class EngramAssetCreate(EngramAssetBase):
    ai_id: UUID


class EngramAssetResponse(EngramAssetBase):
    id: UUID
    ai_id: UUID
    user_id: UUID
    created_at: datetime

    class Config:
        from_attributes = True
