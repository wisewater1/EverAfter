from typing import Dict, List, Any
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
import json


class PersonalityAnalyzer:
    PERSONALITY_CATEGORIES = [
        "values", "memories", "habits", "preferences", "beliefs",
        "communication_style", "humor", "relationships", "goals", "experiences"
    ]

    async def analyze_engram_personality(
        self,
        session: AsyncSession,
        engram_id: str
    ) -> Dict[str, Any]:
        from app.models.engram import EngramDailyResponse, EngramPersonalityFilter

        query = select(EngramDailyResponse).where(
            EngramDailyResponse.engram_id == engram_id
        )
        result = await session.execute(query)
        responses = result.scalars().all()

        if not responses:
            return {
                "total_responses": 0,
                "categories_covered": [],
                "personality_summary": {},
                "traits": []
            }

        categories_covered = list(set(r.question_category for r in responses))
        category_counts = {}

        for response in responses:
            category = response.question_category
            category_counts[category] = category_counts.get(category, 0) + 1

        traits = await self._extract_traits_from_responses(session, responses)

        personality_summary = {
            "total_responses": len(responses),
            "categories_covered": categories_covered,
            "category_distribution": category_counts,
            "dominant_categories": sorted(
                category_counts.items(),
                key=lambda x: x[1],
                reverse=True
            )[:3],
            "traits_extracted": len(traits),
        }

        return {
            "total_responses": len(responses),
            "categories_covered": categories_covered,
            "personality_summary": personality_summary,
            "traits": traits
        }

    async def _extract_traits_from_responses(
        self,
        session: AsyncSession,
        responses: List[Any]
    ) -> List[Dict[str, Any]]:
        traits = []

        for response in responses:
            response_text = response.response_text.lower()
            category = response.question_category

            extracted_traits = self._identify_traits(response_text, category)

            for trait in extracted_traits:
                traits.append({
                    "filter_category": category,
                    "filter_name": trait["name"],
                    "filter_value": trait["value"],
                    "confidence_score": trait["confidence"],
                    "source_response_id": response.id
                })

        return traits

    def _identify_traits(self, text: str, category: str) -> List[Dict[str, Any]]:
        traits = []

        trait_patterns = {
            "values": {
                "family-oriented": ["family", "loved ones", "relatives", "children"],
                "achievement": ["success", "accomplish", "achieve", "goal"],
                "kindness": ["kind", "caring", "compassionate", "helpful"],
                "honesty": ["honest", "truth", "genuine", "authentic"],
            },
            "communication_style": {
                "direct": ["straightforward", "direct", "clear", "blunt"],
                "empathetic": ["understand", "feel", "empathy", "compassion"],
                "humorous": ["funny", "joke", "laugh", "witty"],
                "thoughtful": ["careful", "considerate", "think", "ponder"],
            },
            "preferences": {
                "social": ["people", "friends", "social", "together"],
                "private": ["alone", "quiet", "peace", "solitude"],
                "active": ["activity", "doing", "action", "moving"],
                "relaxed": ["calm", "relax", "peaceful", "easy"],
            }
        }

        if category in trait_patterns:
            for trait_name, keywords in trait_patterns[category].items():
                matches = sum(1 for keyword in keywords if keyword in text)
                if matches > 0:
                    confidence = min(0.5 + (matches * 0.15), 1.0)
                    traits.append({
                        "name": trait_name,
                        "value": f"Shows {trait_name} characteristics",
                        "confidence": confidence
                    })

        return traits

    async def update_personality_filters(
        self,
        session: AsyncSession,
        engram_id: str,
        traits: List[Dict[str, Any]]
    ) -> int:
        from app.models.engram import EngramPersonalityFilter

        updated_count = 0

        for trait in traits:
            existing_filter = await session.execute(
                select(EngramPersonalityFilter).where(
                    EngramPersonalityFilter.engram_id == engram_id,
                    EngramPersonalityFilter.filter_category == trait["filter_category"],
                    EngramPersonalityFilter.filter_name == trait["filter_name"]
                )
            )
            existing = existing_filter.scalar_one_or_none()

            if existing:
                if trait["confidence_score"] > existing.confidence_score:
                    existing.confidence_score = trait["confidence_score"]
                    existing.filter_value = trait["filter_value"]
                    if trait["source_response_id"] not in (existing.source_response_ids or []):
                        existing.source_response_ids = (existing.source_response_ids or []) + [trait["source_response_id"]]
                    updated_count += 1
            else:
                new_filter = EngramPersonalityFilter(
                    engram_id=engram_id,
                    filter_category=trait["filter_category"],
                    filter_name=trait["filter_name"],
                    filter_value=trait["filter_value"],
                    confidence_score=trait["confidence_score"],
                    source_response_ids=[trait["source_response_id"]]
                )
                session.add(new_filter)
                updated_count += 1

        await session.commit()
        return updated_count

    async def calculate_ai_readiness(
        self,
        session: AsyncSession,
        engram_id: str
    ) -> int:
        from app.models.engram import EngramDailyResponse, EngramPersonalityFilter

        response_count_query = select(func.count(EngramDailyResponse.id)).where(
            EngramDailyResponse.engram_id == engram_id
        )
        response_count = await session.scalar(response_count_query) or 0

        category_count_query = select(
            func.count(func.distinct(EngramDailyResponse.question_category))
        ).where(EngramDailyResponse.engram_id == engram_id)
        category_count = await session.scalar(category_count_query) or 0

        filter_count_query = select(func.count(EngramPersonalityFilter.id)).where(
            EngramPersonalityFilter.engram_id == engram_id,
            EngramPersonalityFilter.confidence_score >= 0.6
        )
        filter_count = await session.scalar(filter_count_query) or 0

        response_score = min((response_count / 50) * 50, 50)
        category_score = min((category_count / 10) * 30, 30)
        filter_score = min((filter_count / 20) * 20, 20)

        total_score = int(response_score + category_score + filter_score)

        from app.models.engram import Engram
        engram_query = select(Engram).where(Engram.id == engram_id)
        result = await session.execute(engram_query)
        engram = result.scalar_one_or_none()

        if engram:
            engram.ai_readiness_score = total_score
            engram.total_questions_answered = response_count
            await session.commit()

        return total_score


def get_personality_analyzer() -> PersonalityAnalyzer:
    return PersonalityAnalyzer()
