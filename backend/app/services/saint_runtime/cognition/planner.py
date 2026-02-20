from pydantic import BaseModel
from typing import List, Optional
from datetime import datetime
from ..memory.stream import MemoryStream
from app.ai.llm_client import get_llm_client
import json
import logging

logger = logging.getLogger(__name__)

class PlanStep(BaseModel):
    description: str
    duration_minutes: int
    status: str = "pending"  # pending, active, completed, failed

class DailyPlan(BaseModel):
    date: datetime
    high_level_goal: str
    steps: List[PlanStep] = []

class CognitivePlanner:
    """
    Implements the Planning module from Generative Agents.
    Generates high-level plans based on:
    1. Current Context (Time/Location)
    2. Memory Retrieval (Relevant past experiences)
    3. Reflection (High-level insights)
    """
    def __init__(self, memory_stream: MemoryStream):
        self.memory_stream = memory_stream
        self.current_plan: Optional[DailyPlan] = None

    async def generate_daily_plan(self, saint_profile: dict) -> DailyPlan:
        """
        Generates a broad agenda for the day based on profile and recent memories.
        """
        llm = get_llm_client()
        saint_name = saint_profile.get('name', 'The Saint')
        
        # 1. Retrieve Context
        # We query for morning routine, current threats, and general recent priorities
        context_memories = self.memory_stream.get_context(f"{saint_name} morning routine current priorities threats goals", limit=10)
        context_str = "\n".join([f"- {m.description}" for m in context_memories])
        
        # 2. Generate Plan using LLM
        system_prompt = f"You are the inner planning monologue for {saint_name}, an AI guardian. Create a daily plan of 3 to 5 steps based on your recent context. Output ONLY a valid JSON array of objects with 'description' (string) and 'duration_minutes' (integer) keys."
        user_prompt = f"Recent Context:\n{context_str}\n\nGenerate your daily plan steps."
        
        steps = []
        try:
            response_text = await llm.generate_response([{"role": "user", "content": user_prompt}], system_prompt=system_prompt)
            # Try to parse the JSON output (assuming the LLM followed instructions)
            # Find array bounds in case of markdown wrapping
            start_idx = response_text.find('[')
            end_idx = response_text.rfind(']') + 1
            if start_idx != -1 and end_idx != 0:
                json_data = response_text[start_idx:end_idx]
                parsed_steps = json.loads(json_data)
                for step_data in parsed_steps:
                    steps.append(PlanStep(
                        description=step_data.get('description', 'Focus on duties'),
                        duration_minutes=step_data.get('duration_minutes', 60)
                    ))
            else:
                 raise ValueError("Could not find JSON array in response")
        except Exception as e:
            logger.error(f"Failed to generate LLM plan for {saint_name}: {e}. Using fallback.")
            steps = [
                PlanStep(description="Review domain security and status", duration_minutes=30),
                PlanStep(description="Address primary guardian duties", duration_minutes=60),
                PlanStep(description="Reflect on recent events and family needs", duration_minutes=45)
            ]

        plan = DailyPlan(
            date=datetime.utcnow(),
            high_level_goal=f"Ensure safety and stability for {saint_name}'s domain.",
            steps=steps
        )
        self.current_plan = plan
        return plan

    async def react_to_event(self, event_description: str):
        """
        Re-planning trigger. If an event occurs (e.g. "Security Alert"), 
        the agent might need to abandon the current plan and generate a new one.
        """
        # 1. Evaluate urgency vs current plan
        # 2. If urgent, interrupt and replan
        pass
