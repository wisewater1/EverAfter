from typing import List, Dict, Any, Optional
from pydantic import BaseModel
import asyncio
import logging
from app.ai.llm_client import get_llm_client

logger = logging.getLogger(__name__)

class DeliberationRequest(BaseModel):
    query: str
    context: Optional[str] = None
    participating_saints: List[str] # List of Saint IDs (e.g., 'joseph', 'gabriel')
    coordination_mode: bool = False

class SaintResponse(BaseModel):
    saint_id: str
    content: str
    perspective: str

class DeliberationResult(BaseModel):
    query: str
    transcripts: List[SaintResponse]
    consensus: str
    action_items: List[str]

class ConsensusEngine:
    def __init__(self):
        self.llm = get_llm_client()

    async def deliberate(self, request: DeliberationRequest) -> DeliberationResult:
        """
        Orchestrates a deliberation session among selected Saints.
        """
        # Import here to avoid circular dependency
        from app.services.saint_runtime.core import saint_runtime
        
        saints = []
        for saint_id in request.participating_saints:
            # Check if dynamic agent first
            agent_tuple = saint_runtime._get_components(saint_id)
            # In Core, we don't have a direct "get_agent" that returns the high-level description object easily accessible here
            # But we can infer role from ID or use a helper
            saints.append({"id": saint_id, "role": self._get_saint_role(saint_id)})

        # 1. Gather Individual Perspectives
        logger.info(f"ConsensusEngine: Gathering perspectives for {len(saints)} saints")
        
        # We run these in parallel for efficiency
        tasks = [self._get_saint_perspective(s, request.query, request.context) for s in saints]
        results = await asyncio.gather(*tasks)
        
        responses = [r for r in results if r is not None]

        # 2. Synthesize Consensus
        consensus = await self._synthesize_consensus(request.query, responses)
        
        # 3. Extract Action Items
        actions = await self._extract_action_items(consensus)

        return DeliberationResult(
            query=request.query,
            transcripts=responses,
            consensus=consensus,
            action_items=actions
        )

    async def _get_saint_perspective(self, saint_metadata: Dict, query: str, context: Optional[str]) -> Optional[SaintResponse]:
        try:
            saint_id = saint_metadata["id"]
            role_desc = saint_metadata["role"]
            
            # Using the LLM Client directly for simulation
            system_prompt = f"You are {saint_id.capitalize()}. {role_desc}. Speak in the first person as this Saint."
            user_prompt = f"Query: {query}\nContext: {context or 'None'}\n\nProvide your unique perspective and advice."
            
            # Use explicit messages format for LLMClient
            messages = [{"role": "user", "content": user_prompt}]
            
            response_text = await self.llm.generate_response(messages, system_prompt=system_prompt)
            
            # Simple heuristic for perspective summary
            perspective = response_text[:100] + "..." 
            return SaintResponse(saint_id=saint_id, content=response_text, perspective=perspective)

        except Exception as e:
            logger.error(f"Error getting perspective from {saint_metadata['id']}: {e}")
            return None

    async def _synthesize_consensus(self, query: str, responses: List[SaintResponse]) -> str:
        if not responses:
            return "No consensus could be reached as no Saints responded."

        perspectives_text = "\n\n".join([f"--- {r.saint_id.upper()} ---\n{r.content}" for r in responses])
        
        system_prompt = "You are the Scribe of the Council of Saints. Your job is to synthesize differing viewpoints into a cohesive, wise consensus."
        user_prompt = f"""
        The user asked: "{query}"

        Here are the perspectives from the Council:
        {perspectives_text}

        Please provide:
        1. A summary of the different viewpoints.
        2. A unified consensus or recommendation that balances these views.
        3. Determine if there is strong agreement or significant conflict.
        """
        
        messages = [{"role": "user", "content": user_prompt}]
        return await self.llm.generate_response(messages, system_prompt=system_prompt)

    async def _extract_action_items(self, consensus_text: str) -> List[str]:
        system_prompt = "Extract concrete, actionable steps from the following advice."
        user_prompt = f"Advice:\n{consensus_text}\n\nList 3-5 concrete action items as bullet points."
        
        messages = [{"role": "user", "content": user_prompt}]
        response = await self.llm.generate_response(messages, system_prompt=system_prompt)
        
        # Naive parsing
        lines = [line.strip().lstrip('- ').lstrip('* ') for line in response.split('\n') if line.strip().startswith(('-', '*'))]
        return lines

    def _get_saint_role(self, saint_id: str) -> str:
        roles = {
            "joseph": "Guardian of Family and Legacy. You care about stability, heritage, and the long-term well-being of the family tree.",
            "gabriel": "Guardian of Wealth and Communication. You focus on financial prudence, strategic resource management, and delivering clear messages.",
            "raphael": "Guardian of Health and Travelers. You focus on physical and mental well-being, healing, and safe journeys.",
            "michael": "Guardian of Protection and Justice. You focus on security, safety, defense against threats, and moral courage.",
            "anthony": "Guardian of Lost Things and Truth. You focus on recovering what is lost, integrity, and finding hidden wisdom."
        }
        return roles.get(saint_id.lower(), "A wise and ancient advisor.")
