from typing import List, Dict, Any, Optional
from app.services.saint_runtime.collaboration.consensus import ConsensusEngine, DeliberationRequest

class CouncilService:
    def __init__(self):
        self.consensus_engine = ConsensusEngine()

    async def deliberate(self, query: str, context: Optional[str] = None) -> Dict[str, Any]:
        """
        Conducts a Council deliberation on a user query using the ConsensusEngine.
        """
        # Default participants for a full council
        participants = ["joseph", "gabriel", "raphael", "michael", "anthony"]
        
        request = DeliberationRequest(
            query=query,
            context=context,
            participating_saints=participants
        )
        
        result = await self.consensus_engine.deliberate(request)
        
        # Transform for API response
        return {
            "transcript": [
                {"saint": r.saint_id, "content": r.content, "perspective": r.perspective} 
                for r in result.transcripts
            ],
            "consensus": result.consensus,
            "action_items": result.action_items,
            "query": result.query
        }

council_service = CouncilService()
