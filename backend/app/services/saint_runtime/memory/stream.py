import math
from datetime import datetime
from typing import List, Dict, Tuple
from .types import MemoryObject

from datetime import datetime
from typing import List, Tuple
from .types import MemoryObject
# Import Akashic Service
from app.services.akashic_service import akashic

class MemoryStream:
    """
    Implements the Memory Stream from 'Generative Agents: Interactive Simulacra of Human Behavior'.
    BACKEND: AKASHIC RECORD (Semantic Search + Persistence)
    Key Feature: Retrieval = Recency * Importance * Relevance
    """
    def __init__(self):
        # We no longer keep a local list; we trust the Akashic Record
        pass
        
    def add_memory(self, memory: MemoryObject):
        # Canonize into Akashic Record
        # We serialize the full MemoryObject into the metadata
        akashic.canonize(
            content=memory.description,
            metadata=memory.dict()
        )
        
    def get_context(self, query: str, limit: int = 5, saint_id: str = None) -> List[MemoryObject]:
        """
        Retrieves the most relevant memories for a given query context.
        Uses Akashic Semantic Search (Relevance) then re-ranks by Recency & Importance.
        """
        # 1. semantic search from Akashic (Relevance)
        # We fetch more than we need (limit*3) to allow for re-ranking
        filters = {"saint_id": saint_id} if saint_id else None
        
        akashic_results = akashic.search(
            query=query, 
            limit=limit * 3, 
            min_score=0.1,
            filters=filters
        )
        
        if not akashic_results:
            return []
            
        # 2. Convert back to MemoryObjects and Re-score
        scored_candidates = []
        for res in akashic_results:
            # Reconstruct MemoryObject
            metadata = res.get("metadata", {})
            try:
                # If metadata is just dict, pydantic parse
                mem_obj = MemoryObject(**metadata)
            except Exception:
                # Fallback if metadata schema drift
                continue
                
            relevance = res.get("score", 0.0)
            
            # Recency & Importance
            recency = self._calculate_recency(mem_obj)
            importance = self._calculate_importance(mem_obj)
            
            # Weighted Score
            # Relevance from embedding is 0-1.
            # Recency is 0-1.
            # Importance is normalized 0-1.
            total_score = (recency * 1.0) + (importance * 1.0) + (relevance * 2.0)
            
            scored_candidates.append((mem_obj, total_score))
            
        # 3. Sort by Total Score
        scored_candidates.sort(key=lambda x: x[1], reverse=True)
        
        # 4. Return Top N
        return [m[0] for m in scored_candidates[:limit]]

    def _calculate_recency(self, memory: MemoryObject) -> float:
        """
        Exponential decay function based on hours since last access.
        Feature: Decay factor = 0.99 per hour.
        """
        now = datetime.utcnow()
        # Ensure we don't have negative time if clock drift
        if memory.last_accessed > now:
            return 1.0
            
        delta = now - memory.last_accessed
        hours = delta.total_seconds() / 3600
        return 0.99 ** hours

    def _calculate_importance(self, memory: MemoryObject) -> float:
        """
        Raw importance score (0-1).
        """
        return memory.importance / 10.0
