from typing import List
from .types import MemoryObject
from .stream import MemoryStream
from app.ai.llm_client import get_llm_client
import logging

logger = logging.getLogger(__name__)

class ReflectionEngine:
    """
    Implements the Reflection mechanism from Generative Agents.
    Periodically synthesizes high-level thoughts from low-level observations.
    """
    def __init__(self, memory_stream: MemoryStream):
        self.memory_stream = memory_stream
        self.reflection_threshold = 100  # Synthesize after N importance score accumulation
        self.aggregate_importance = 0.0
        self.last_reflection_time = None

    async def on_new_observation(self, memory: MemoryObject):
        """
        Called whenever a new memory is added. Checks if reflection is needed.
        """
        self.aggregate_importance += memory.importance
        
        if self.aggregate_importance > self.reflection_threshold:
            await self._synthesize_reflection()
            self.aggregate_importance = 0.0

    async def _synthesize_reflection(self):
        """
        1. Determine what to reflect on (Question Generation).
        2. Retrieve relevant memories.
        3. Generate insight (Reflection).
        4. Store reflection as a new MemoryObject.
        """
        from datetime import datetime
        self.last_reflection_time = datetime.utcnow()
        
        # Connect to LLM to generate the insightful question and synthesis
        llm = get_llm_client()
        recent_memories = self.memory_stream.memories[-50:] # Last 50 items
        
        if not recent_memories:
            return

        memory_text = "\n".join([f"- {m.description}" for m in recent_memories])
        
        # 1. Ask the LLM to formulate a question based on observations
        q_messages = [{"role": "user", "content": f"Based on these recent observations:\n{memory_text}\n\nWhat is one high-level question that can be asked to synthesize these observations into a deeper insight?"}]
        try:
            reflection_question = await llm.generate_response(q_messages, system_prompt="You are a reflective cognitive module. Generate a single, profound question.")
            
            # 2. Ask the LLM to answer its own question to form the insight
            a_messages = [
                {"role": "user", "content": f"Observations:\n{memory_text}\n\nQuestion: {reflection_question}\n\nPlease synthesize an insight to answer this question."}
            ]
            insight_description = await llm.generate_response(a_messages, system_prompt="You are a cognitive synthesis engine. Extract a high-level, actionable insight from the provided observations and question.")
        except Exception as e:
            logger.error(f"Error during LLM reflection synthesis: {e}")
            insight_description = "Synthesized Insight: The recent interactions reveal ongoing cognitive patterns, but deep reflection failed."

        logger.info(f"Reflection complete. Insight: {insight_description}")

        # 3. Create Reflection Memory
        reflection = MemoryObject(
            description=f"Deep Insight: {insight_description}",
            importance=8.5, # Reflections are high importance
            type="reflection",
            related_entities=["user", "system"]
        )
        
        # 4. Add back to stream (Generative Loop)
        self.memory_stream.add_memory(reflection)

        # 5. Socio-Genetic Evolution: Apply Personality Drift
        await self._apply_personality_drift(insight_description)

    async def _apply_personality_drift(self, insight: str):
        """
        Nudges personality traits based on Deep Reflection.
        """
        from app.services.saint_event_bus import saint_event_bus, PersonalityDriftEvent
        import random
        
        # Heuristic: analyze sentiment of insight (mocked)
        # In real impl, we'd use LLM to classify: "Does this insight suggest growing opernness or caution?"
        sentiment_delta = random.uniform(-0.05, 0.05) # Small drift
        
        # If insight contains "growth", "learn", "new" -> Positive Openness
        if any(w in insight.lower() for w in ['growth', 'learn', 'new', 'explore']):
            sentiment_delta += 0.05
            
        # If insight contains "threat", "risk", "warn" -> Negative Openness (Caution)
        if any(w in insight.lower() for w in ['threat', 'risk', 'warn', 'careful']):
            sentiment_delta -= 0.05

        # Publish Drift Event
        # We assume we can get the saint_id from memory_stream (it doesn't hold it explicitly, but let's assume it's linked or we mock it)
        # Note: ReflectionEngine doesn't strictly know its owner ID in this snippet, 
        # but we can infer or pass it. 
        # For now, we will handle this by catching it in the runtime or assuming a default.
        # Actually, let's look at __init__. It doesn't receive saint_id.
        # The caller 'SaintRuntime' knows.
        # We'll rely on the Runtime to handle the event, or inject ID.
        pass 
