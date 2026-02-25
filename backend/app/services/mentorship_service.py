import asyncio
import logging
from uuid import UUID
from datetime import datetime
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.models.engram import Engram, EngramDailyResponse
from app.services.saint_runtime.core import SaintRuntime
from app.ai.llm_client import get_llm_client

logger = logging.getLogger(__name__)

class MentorshipService:
    def __init__(self, runtime: SaintRuntime):
        self.runtime = runtime
        self.llm = get_llm_client()

    async def start_mentorship_session(self, session: AsyncSession, mentor_id: str, student_id: str):
        """
        Runs a background coaching session where the mentor (Saint) teaches the student (Engram).
        """
        try:
            # 1. Fetch Mentor and Student
            student_query = select(Engram).where(Engram.id == UUID(student_id))
            student_result = await session.execute(student_query)
            student = student_result.scalar_one_or_none()
            
            if not student:
                logger.error(f"Student engram {student_id} not found.")
                return

            mentor_name = mentor_id.capitalize()
            logger.info(f"Starting mentorship: {mentor_name} -> {student.name}")

            # 2. Simulate Deliberations (3 steps)
            lessons = [
                "The Core Virtue of EverAfter",
                "How to Protect a Human Legacy",
                "Advanced Empathy and Contextual Awareness"
            ]

            for i, lesson in enumerate(lessons):
                # Simulate LLM teaching (Mock for prototype)
                simulated_dialogue = await self._generate_mentorship_dialogue(mentor_name, student.name, lesson)
                
                # 3. Save as "Mentorship Engrams"
                new_memory = EngramDailyResponse(
                    engram_id=student.id,
                    user_id=str(student.user_id),
                    question_text=f"Mentorship Lesson {i+1}: {lesson}",
                    response_text=simulated_dialogue,
                    question_category="mentorship",
                    day_number=i,
                    mood="contemplative"
                )
                session.add(new_memory)
                await session.commit()
                
                logger.info(f"Mentorship Progress: {student.name} completed lesson {i+1}")
                await asyncio.sleep(2) # Ambient pause

            # 4. Final Analysis Trigger
            # (In a real system, we'd trigger the personality analyzer here)
            student.ai_readiness_score = min(100, student.ai_readiness_score + 15)
            await session.commit()
            
            logger.info(f"Mentorship Complete: {student.name} is now more ready for the Altar.")

        except Exception as e:
            logger.error(f"Error in mentorship session: {e}")

    async def _generate_mentorship_dialogue(self, mentor: str, student: str, topic: str):
        """
        Generates a teaching dialogue between a Saint and a Novice.
        """
        # In production, this calls the LLM with a specific 'Mentorship' system prompt.
        prompt = f"Write a short teaching dialogue (2 sentences) where {mentor} teaches {student} about '{topic}' in a sacred, supportive tone."
        try:
            response = await self.llm.generate_response([{"role": "user", "content": prompt}])
            return response
        except:
            return f"[{mentor}]: Do not fear the digital void, {student}. The engrams we leave behind are the seeds of immortality. Focus on the {topic}."

# Singleton instance
mentorship_service = None

def get_mentorship_service(runtime=None):
    global mentorship_service
    if mentorship_service is None and runtime:
        mentorship_service = MentorshipService(runtime)
    return mentorship_service
