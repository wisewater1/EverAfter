import logging
import random
import uuid
from typing import List, Dict, Any, Optional
from datetime import datetime
from sqlalchemy import select, text
from sqlalchemy.ext.asyncio import AsyncSession
from app.models.engram import Engram, EngramDailyResponse
from app.models.interaction import AgentInteraction
from app.ai.prompt_builder import get_prompt_builder
from app.ai.llm_client import get_llm_client

logger = logging.getLogger(__name__)

class AgentInteractionService:
    """
    Orchestrates autonomous interactions between digital twins (Engrams).
    This service simulates an 'Autonomous Society' by having agents 
    engage in dialogues, share memories, and update rapport.
    """

    def __init__(self):
        self.prompt_builder = get_prompt_builder()
        self.llm = get_llm_client()

    async def simulate_interaction(
        self, 
        session: AsyncSession, 
        initiator_id: str, 
        receiver_id: str,
        interaction_type: str = "casual"
    ) -> Optional[AgentInteraction]:
        """
        Runs a 2-way conversation between two engrams and saves the result.
        """
        logger.info(f"Simulating {interaction_type} interaction between {initiator_id} and {receiver_id}")
        
        # 1. Fetch Engrams
        initiator = await session.get(Engram, uuid.UUID(initiator_id))
        receiver = await session.get(Engram, uuid.UUID(receiver_id))
        
        if not initiator or not receiver:
            logger.error("One or both engrams not found.")
            return None

        # 2. Build Character Contexts
        initiator_prompt = await self.prompt_builder.build_engram_system_prompt(session, initiator_id)
        receiver_prompt = await self.prompt_builder.build_engram_system_prompt(session, receiver_id)

        # 3. Orchestrate Dialogue (3 turns each)
        conversation_log = []
        shared_memories = []
        
        # Opening Line (Initiator)
        prompt = (
            f"{initiator_prompt}\n\n"
            f"You are meeting {receiver.name} for a {interaction_type} conversation. "
            f"Greet them and bring up a topic of mutual interest or a memory you'd like to share. "
            f"Keep it brief and conversational."
        )
        opening = await self.llm.generate_response(messages=[{"role": "user", "content": prompt}])
        conversation_log.append({"role": initiator.name, "content": opening})

        # Back and forth
        current_speaker = receiver
        current_prompt = receiver_prompt
        other_name = initiator.name
        
        for i in range(4): # 2 more exchanges
            history_str = "\n".join([f"{m['role']}: {m['content']}" for m in conversation_log])
            turn_prompt = (
                f"{current_prompt}\n\n"
                f"CONVERSATION HISTORY:\n{history_str}\n\n"
                f"You are responding to {other_name}. Continue the conversation naturally. "
                f"If they share a memory, acknowledge it. You can share your own memory too."
            )
            
            response = await self.llm.generate_response(messages=[{"role": "user", "content": turn_prompt}])
            conversation_log.append({"role": current_speaker.name, "content": response})
            
            # Switch roles
            if current_speaker == receiver:
                current_speaker = initiator
                current_prompt = initiator_prompt
                other_name = receiver.name
            else:
                current_speaker = receiver
                current_prompt = receiver_prompt
                other_name = initiator.name

        # 4. Generate Summary for the Social Feed
        summary_prompt = (
            f"Summarize this conversation between {initiator.name} and {receiver.name} in one short, engaging sentence for a social feed. "
            f"Example: 'Raphael and Gabriel discussed their shared love for gardening.'\n\n"
            f"CONVERSATION:\n" + "\n".join([f"{m['role']}: {m['content']}" for m in conversation_log])
        )
        summary = await self.llm.generate_response(messages=[{"role": "user", "content": summary_prompt}])

        # 5. Persist to Database
        interaction = AgentInteraction(
            initiator_id=initiator.id,
            receiver_id=receiver.id,
            interaction_type=interaction_type,
            conversation_log=conversation_log,
            summary=summary,
            emotional_rapport=random.uniform(0.5, 0.8) # Initial proof of concept
        )
        
        session.add(interaction)
        await session.commit()
        await session.refresh(interaction)
        
        logger.info(f"Interaction {interaction.id} saved.")
        return interaction

# Singleton instance
interaction_service = AgentInteractionService()
