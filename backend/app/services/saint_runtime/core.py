import logging
import uuid
from typing import Dict, Any, List, Optional
from datetime import datetime
from sqlalchemy.ext.asyncio import AsyncSession

# Core Services
from app.services.saint_agent_service import saint_agent_service
from app.services.agent_bus import agent_bus, AgentEvent
from app.services.mission_board import mission_board

# Deep Integration Modules
from .memory.stream import MemoryStream
from .memory.stream import MemoryStream
from .memory.types import MemoryObject
from .reflection.reflection import ReflectionEngine # Assuming reflection moved, or just memory.reflection
# Check import path later if reflection.py is actually in memory/reflection.py
from .memory.reflection import ReflectionEngine
from .cognition.planner import CognitivePlanner
from .collaboration.consensus import ConsensusEngine

logger = logging.getLogger(__name__)

class SaintRuntime:
    """
    The Unified Runtime for Saint Agents (Deep Integration).
    Merges:
    1. Generative Agents (Memory, Reflection, Planning)
    2. Agentic Collaboration (Consensus, Missions)
    3. Legacy Saint Logic (SaintAgentService)
    """

    def __init__(self):
        # 1. Collaboration Layer
        self.bus = agent_bus
        self.consensus_engine = ConsensusEngine()
        
        # 2. Cognition & Memory Layer (Per-Saint State)
        # In a real DB-backed impl, we'd load these. For prototype, we keep in-memory.
        self._saint_memories: Dict[str, MemoryStream] = {}
        self._saint_reflectors: Dict[str, ReflectionEngine] = {}
        self._saint_planners: Dict[str, CognitivePlanner] = {}

    def _get_components(self, saint_id: str):
        """Lazy initialization of components for a saint."""
        if saint_id not in self._saint_memories:
            stream = MemoryStream()
            self._saint_memories[saint_id] = stream
            self._saint_reflectors[saint_id] = ReflectionEngine(stream)
            self._saint_planners[saint_id] = CognitivePlanner(stream)
        
        return (
            self._saint_memories[saint_id],
            self._saint_reflectors[saint_id],
            self._saint_planners[saint_id]
        )

    async def chat(
        self,
        session: AsyncSession,
        user_id: str,
        saint_id: str,
        message: str,
        coordination_mode: bool = False
    ) -> Dict[str, Any]:
        """
        Enhanced Chat Loop:
        1. Observe (User Message) -> Memory
        2. Retrieve (Context) -> Stream
        3. Reflect (Background) -> Engine
        4. Plan/React -> Planner
        5. Respond -> LLM (with enriched context)
        """
        logger.info(f"SaintRuntime: Chat request for {saint_id} (Coordination: {coordination_mode})")
        
        # Get components
        memory, reflector, planner = self._get_components(saint_id)

        # 1. OBSERVE: Add user message to memory
        observation = MemoryObject(
            description=f"User said: {message}",
            importance=5.0, # Default medium importance
            type="observation",
            saint_id=saint_id
        )
        memory.add_memory(observation)
        
        # 2. REFLECT: Trigger reflection loop (async)
        await reflector.on_new_observation(observation)
        
        # 3. RETRIEVE: Get relevant context
        # We retrieve top 3 memories relevant to the user's current message
        # Use saint_id to filter Akashic records
        relevant_memories = memory.get_context(message, limit=3, saint_id=saint_id)
        context_str = "\n".join([f"- {m.description} (relevance: {m.importance})" for m in relevant_memories])
        
        # 4. ENRICH: Inject context into the user message for the LLM
        # This is the "Deep Integration" - the LLM effectively "remembers"
        enriched_message = message
        if context_str:
            enriched_message = (
                f"SYSTEM NOTE - RELEVANT MEMORIES:\n{context_str}\n\n"
                f"USER MESSAGE:\n{message}"
            )

        # 5. PUBLISH EVENT (for Agentic Collab)
        await self.bus.publish(AgentEvent(
            type="message",
            sender="user",
            payload={
                "target": saint_id,
                "content": message,
                "mode": "coordination" if coordination_mode else "single"
            }
        ))

        # 6. COGNITION/REACT
        # If coordination mode, maybe trigger consensus?
        if coordination_mode:
            # Simple heuristic: if message asks for advice, group thought, or 'all of you'
            if any(word in message.lower() for word in ['council', 'all', 'everyone', 'together', 'agree', 'consensus', 'advice', 'what do you think']):
                from .collaboration.consensus import DeliberationRequest
                logger.info(f"SaintRuntime: Triggering Consensus for {message}")
                request = DeliberationRequest(
                    query=message,
                    context=context_str,
                    participating_saints=[saint_id, "michael", "raphael", "gabriel", "joseph"], # Default core council
                    coordination_mode=True
                )
                try:
                    # Run deliberation
                    deliberation_result = await self.consensus_engine.deliberate(request)
                    
                    # Inject consensus into the prompt for the primary responding saint
                    enriched_message += (
                        f"\n\nCOUNCIL CONSENSUS REACHED:\n"
                        f"{deliberation_result.consensus}\n\n"
                        f"ACTION ITEMS:\n"
                        f"{chr(10).join(deliberation_result.action_items)}\n\n"
                        f"Please deliver this consensus to the user in your own voice, adopting their recommendations."
                    )
                except Exception as e:
                    logger.error(f"Error during consensus deliberation: {e}")

        # 7. EXECUTE: Call standard Agent Service with ENRICHED context
        response = await saint_agent_service.chat(session, user_id, saint_id, enriched_message)
        
        # 8. OBSERVE: Add own response to memory
        ai_content = response.get("content", "")
        memory.add_memory(MemoryObject(
            description=f"I responded: {ai_content}",
            importance=3.0,
            type="observation",
            saint_id=saint_id
        ))

        # 9. PUBLISH RESPONSE
        await self.bus.publish(AgentEvent(
            type="message",
            sender=saint_id,
            payload={
                "target": "user",
                "content": ai_content,
                "conversation_id": response.get("conversation_id")
            }
        ))

        return response

    async def create_coordination_mission(self, title: str, objective: str, initiator: str):
        """Delegate to MissionBoard."""
        return await mission_board.create_mission(title, objective, initiator)

    async def get_active_missions(self, user_id: str) -> list[dict]:
        """Delegate to MissionBoard."""
        # For prototype, MissionBoard stores all. In real app, filter by user/saint visibility.
        return [m.dict() for m in mission_board._missions.values()]

    async def listen_for_events(self):
        """Background listener for AgentBus."""
        logger.info("SaintRuntime: Started Event Listener")
        self.bus.subscribe(self._handle_event)
        await self.bus.listen()

    async def trigger_social(self, session: AsyncSession, initiator_id: str, receiver_id: str):
        """
        Trigger an autonomous interaction between two agents.
        This uses the high-level InteractionService to simulate society.
        """
        from app.services.interaction_service import interaction_service
        logger.info(f"SaintRuntime: Triggering social interaction between {initiator_id} and {receiver_id}")
        return await interaction_service.simulate_interaction(session, initiator_id, receiver_id)

    async def _handle_event(self, event: AgentEvent):
        if event.sender == "system":
            return
        # Log or react to events
        pass

    async def handle_system_event(self, saint_id: str, description: str, importance: float = 10.0):
        """
        Injects a high-importance system event into the agent's memory stream.
        Used for 'Akashic Synthesis' where other Saints trigger cognitive updates.
        """
        logger.info(f"SaintRuntime: System Event for {saint_id} - {description}")
        
        memory, reflector, _ = self._get_components(saint_id)
        
        event_memory = MemoryObject(
            description=f"SYSTEM ALERT: {description}",
            importance=importance,
            type="system_event",
            saint_id=saint_id
        )
        memory.add_memory(event_memory)
        
        # Force a reflection cycle to process this new critical information
        await reflector.on_new_observation(event_memory)
        
        # Publish event for UI socket updates
        await self.bus.publish(AgentEvent(
            type="system_alert",
            sender=saint_id,
            payload={"content": description, "importance": importance}
        ))

# Singleton
saint_runtime = SaintRuntime()
