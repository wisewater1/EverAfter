from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from typing import List, Dict, Any, Optional
from app.services.akashic_service import akashic
from app.api.auth_utils import get_current_user

router = APIRouter(prefix="/api/v1/saints/memory", tags=["akashic"])

class MemoryCreate(BaseModel):
    content: str
    metadata: Dict[str, Any]
    saint_id: str

class MemorySearch(BaseModel):
    query: str
    limit: int = 5
    min_score: float = 0.3

class MemoryResponse(BaseModel):
    id: str
    content: str
    metadata: Dict[str, Any]
    timestamp: str
    score: Optional[float] = None

@router.post("/", response_model=MemoryResponse)
async def canonize_memory(memory: MemoryCreate, current_user: Any = Depends(get_current_user)):
    """
    Canonize a fact into the Akashic Record (Shared Memory).
    """
    try:
        # Enforce metadata
        memory.metadata['source_saint'] = memory.saint_id
        email = getattr(current_user, "email", None) if current_user else None
        record = await akashic.canonize(memory.content, memory.metadata, user_email=email)
        return record
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/search", response_model=List[MemoryResponse])
async def search_memories(search: MemorySearch, current_user: Any = Depends(get_current_user)):
    """
    Semantic search the Akashic Record.
    """
    try:
        if not akashic.memories:
             # Lazy load check
             akashic._load_memories()
             
        email = getattr(current_user, "email", None) if current_user else None
        results = await akashic.search(search.query, search.limit, search.min_score, user_email=email)
        return results
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
        
@router.get("/dump")
async def dump_memories():
    return akashic.memories
