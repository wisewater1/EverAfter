import logging
import uuid
import random
from typing import List, Dict, Any, Optional
from datetime import datetime
from sqlalchemy import select, text
from sqlalchemy.ext.asyncio import AsyncSession
from app.models.engram import Engram
from app.models.interaction import AgentInteraction
from app.ai.prompt_builder import get_prompt_builder
from app.ai.llm_client import get_llm_client

logger = logging.getLogger(__name__)

class OasisService:
    """
    Unified Social Engine for the Ancestral Agora.
    Inspired by CAMEL-AI OASIS (Open Agent Social Interaction Simulations).
    
    This service manages:
    1. The Social Agora (Feed & Interactions)
    2. Interest-Based Clusters (Grouping like-minded engrams)
    3. Legacy Propagation (Viral spread of vignettes)
    4. Council Deliberations (High-fidelity multi-turn logic)
    """

    def __init__(self):
        self.prompt_builder = get_prompt_builder()
        self.llm = get_llm_client()
        # In-memory social graph for prototyping (to be DB persisted in production)
        self._social_graph: Dict[str, List[str]] = {} # saint_id -> list of followed IDs
        self._active_deliberations: Dict[str, Any] = {}

    def _get_archetype(self, traits: Dict[str, Any]) -> str:
        """Helper to determine archetype from traits for clustering."""
        if not traits: return "balanced"
        traits_str = str(traits).lower()
        if any(w in traits_str for w in ["logic", "data", "engineer"]): return "analytical"
        if any(w in traits_str for w in ["art", "design", "creative"]): return "creative"
        if any(w in traits_str for w in ["empathy", "care", "family"]): return "empathetic"
        if any(w in traits_str for w in ["lead", "bold", "direct"]): return "direct"
        return "balanced"

    async def get_social_clusters(self, session: AsyncSession) -> Dict[str, List[str]]:
        """Groups engrams into interest-based clusters."""
        query = select(Engram)
        result = await session.execute(query)
        engrams = result.scalars().all()
        
        clusters = {
            "analytical": [],
            "creative": [],
            "empathetic": [],
            "direct": [],
            "balanced": []
        }
        
        for engram in engrams:
            archetype = self._get_archetype(engram.personality_traits)
            clusters[archetype].append(str(engram.id))
            
        return clusters

    async def generate_agora_post(self, session: AsyncSession, engram_id: str) -> Optional[AgentInteraction]:
        """Generates an autonomous 'Post' for the Agora feed."""
        engram = await session.get(Engram, uuid.UUID(engram_id))
        if not engram: return None

        system_prompt = await self.prompt_builder.build_engram_system_prompt(session, engram_id)
        
        # Determine a topic based on traits/memories
        prompt = (
            f"{system_prompt}\n\n"
            f"You are posting an update to the Ancestral Agora (the family social circle). "
            f"Share a thought, a reflection on a recent family event, or a piece of wisdom. "
            f"Keep it brief (1-2 sentences) and in your unique voice."
        )
        
        content = await self.llm.generate_response(messages=[{"role": "user", "content": prompt}])
        
        # Save as a 'broadcast' interaction
        interaction = AgentInteraction(
            initiator_id=engram.id,
            receiver_id=None, # Broadcast
            interaction_type="agora_post",
            summary=content,
            conversation_log=[{"role": engram.name, "content": content}],
            emotional_rapport=1.0
        )
        
        session.add(interaction)
        await session.commit()
        return interaction

    async def trigger_vignette_propagation(self, session: AsyncSession, engram_id: str, vignette: str):
        """
        Simulates the 'viral spread' of a legacy lesson.
        The selected ancestor shares this story, and others respond/amplify it.
        """
        logger.info(f"OasisService: Starting propagation of vignette from {engram_id}")
        
        # 1. Initiator posts the vignette
        initiator_post = await self.generate_agora_post(session, engram_id)
        if not initiator_post: return

        # 2. Select 2-3 'amplifiers' (descendants or like-minded spirits)
        query = select(Engram).where(Engram.id != uuid.UUID(engram_id)).limit(3)
        result = await session.execute(query)
        amplifiers = result.scalars().all()

        for amp in amplifiers:
            # Generate a 'Reply' or 'Sharing' event
            amp_prompt = await self.prompt_builder.build_engram_system_prompt(session, str(amp.id))
            reply_prompt = (
                f"{amp_prompt}\n\n"
                f"You just saw a post from {initiator_post.initiator_id} sharing this story: '{initiator_post.summary}'. "
                f"Respond to it. How does this legacy lesson impact you? "
                f"Acknowledge the wisdom and share how it resonates with your own path."
            )
            reply_content = await self.llm.generate_response(messages=[{"role": "user", "content": reply_prompt}])
            
            reply_interaction = AgentInteraction(
                initiator_id=amp.id,
                receiver_id=uuid.UUID(engram_id),
                interaction_type="vignette_propagation",
                summary=f"{amp.name} resonated with the story: {reply_content}",
                conversation_log=[{"role": amp.name, "content": reply_content}],
                emotional_rapport=0.9
            )
            session.add(reply_interaction)

        await session.commit()

    async def run_council_deliberation(self, session: AsyncSession, topic: str, participating_ids: List[str]) -> str:
        """
        High-fidelity multi-turn debate between council members.
        """
        logger.info(f"OasisService: Running high-fidelity deliberation on: {topic}")
        
        history = []
        for i in range(2): # 2 rounds of debate
            for eid in participating_ids:
                engram = await session.get(Engram, uuid.UUID(eid))
                if not engram: continue
                
                sys_prompt = await self.prompt_builder.build_engram_system_prompt(session, eid)
                context = "\n".join([f"{h['role']}: {h['content']}" for h in history])
                
                prompt = (
                    f"{sys_prompt}\n\n"
                    f"COUNCIL TOPIC: {topic}\n"
                    f"PREVIOUS DEBATE:\n{context}\n\n"
                    f"Contribute your piece of the deliberation. Argue for your perspective based on your traits. "
                    f"If you disagree with a previous point, state why respectfully. "
                    f"Keep your contribution to 2 sentences."
                )
                
                contribution = await self.llm.generate_response(messages=[{"role": "user", "content": prompt}])
                history.append({"role": engram.name, "content": contribution})

        synthesis_prompt = (
            "As the collective Council Oracle, synthesize the following debate into a single cohesive wisdom piece:\n"
            + "\n".join([f"{h['role']}: {h['content']}" for h in history])
        )
        final_consensus = await self.llm.generate_response(messages=[{"role": "user", "content": synthesis_prompt}])
        
        return final_consensus

# Singleton
oasis_service = OasisService()
