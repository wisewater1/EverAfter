from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from typing import List, Dict, Any, Optional
from app.services.council_service import council_service

router = APIRouter(prefix="/api/v1/saints/council", tags=["council"])

class DeliberationRequest(BaseModel):
    query: str
    context: Optional[str] = None

class TranscriptItem(BaseModel):
    saint: str
    content: str
    perspective: str

class DeliberationResponse(BaseModel):
    transcript: List[TranscriptItem]
    consensus: str
    action_items: List[str]
    query: str

@router.post("/deliberate", response_model=DeliberationResponse)
async def deliberate(request: DeliberationRequest):
    """
    Trigger a multi-agent Council deliberation.
    """
    try:
        result = await council_service.deliberate(request.query, request.context)
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
