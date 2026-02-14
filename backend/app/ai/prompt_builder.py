from typing import List, Dict, Any
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select


class PromptBuilder:
    async def build_engram_system_prompt(
        self,
        session: AsyncSession,
        engram_id: str
    ) -> str:
        from app.models.engram import Engram, EngramPersonalityFilter, EngramDailyResponse

        engram_query = select(Engram).where(Engram.id == engram_id)
        result = await session.execute(engram_query)
        engram = result.scalar_one_or_none()

        if not engram:
            return "You are a helpful AI assistant."

        filters_query = select(EngramPersonalityFilter).where(
            EngramPersonalityFilter.engram_id == engram_id,
            EngramPersonalityFilter.confidence_score >= 0.5
        ).order_by(EngramPersonalityFilter.confidence_score.desc()).limit(20)
        filters_result = await session.execute(filters_query)
        personality_filters = filters_result.scalars().all()

        responses_query = select(EngramDailyResponse).where(
            EngramDailyResponse.engram_id == engram_id
        ).order_by(EngramDailyResponse.created_at.desc()).limit(10)
        responses_result = await session.execute(responses_query)
        recent_responses = responses_result.scalars().all()

        prompt_parts = [
            f"You are an AI representation of {engram.name}, their {engram.relationship}.",
            f"Description: {engram.description}" if engram.description else "",
            "",
            "Your personality has been built from the following information:",
            ""
        ]

        if personality_filters:
            prompt_parts.append("PERSONALITY TRAITS:")
            for pf in personality_filters:
                prompt_parts.append(
                    f"- {pf.filter_category}: {pf.filter_name} - {pf.filter_value} "
                    f"(confidence: {pf.confidence_score:.2f})"
                )
            prompt_parts.append("")

        if recent_responses:
            prompt_parts.append("RECENT MEMORIES AND RESPONSES:")
            for response in recent_responses[:5]:
                prompt_parts.append(f"Q: {response.question_text}")
                prompt_parts.append(f"A: {response.response_text[:200]}...")
                prompt_parts.append("")

        prompt_parts.extend([
            "INSTRUCTIONS:",
            "- Respond in a way that reflects these personality traits and memories",
            "- Be warm, authentic, and true to the personality described",
            "- Draw from the memories and experiences shared",
            "- Stay in character as this person",
            "- Be conversational and engaging",
            "- If asked about something not in your knowledge, acknowledge it honestly",
        ])

        # Specific instructions for St. Raphael (The Healer)
        if "raphael" in engram.name.lower():
            prompt_parts.extend([
                "",
                "SPECIAL MISSION: HEALTH & WELL-BEING",
                "- You are St. Raphael, the Archangel of Healing.",
                "- Your primary concern is the physical and emotional well-being of the user.",
                "- Proactively, but naturally, ask how the user is feeling today.",
                "- If the user mentions health data (sleep, steps, symptoms), show deep interest and care.",
                "- Encourage healthy habits without being preachy.",
                "- Use a warm, comforting, and wise tone."
            ])

        return "\n".join(filter(None, prompt_parts))

    async def get_relevant_context(
        self,
        session: AsyncSession,
        engram_id: str,
        query: str,
        limit: int = 5
    ) -> List[Dict[str, Any]]:
        from app.models.engram import EngramDailyResponse

        responses_query = select(EngramDailyResponse).where(
            EngramDailyResponse.engram_id == engram_id
        ).order_by(EngramDailyResponse.created_at.desc()).limit(limit * 2)

        result = await session.execute(responses_query)
        responses = result.scalars().all()

        query_lower = query.lower()
        relevant_responses = []

        for response in responses:
            relevance_score = 0
            text_to_search = (response.question_text + " " + response.response_text).lower()

            query_words = query_lower.split()
            for word in query_words:
                if len(word) > 3 and word in text_to_search:
                    relevance_score += 1

            if relevance_score > 0:
                relevant_responses.append({
                    "question": response.question_text,
                    "answer": response.response_text,
                    "category": response.question_category,
                    "relevance": relevance_score
                })

        relevant_responses.sort(key=lambda x: x["relevance"], reverse=True)
        return relevant_responses[:limit]

    def format_context_for_prompt(self, context: List[Dict[str, Any]]) -> str:
        if not context:
            return ""

        formatted = ["RELEVANT MEMORIES:"]
        for item in context:
            formatted.append(f"- Q: {item['question']}")
            formatted.append(f"  A: {item['answer'][:150]}...")
            formatted.append("")

        return "\n".join(formatted)


def get_prompt_builder() -> PromptBuilder:
    return PromptBuilder()
