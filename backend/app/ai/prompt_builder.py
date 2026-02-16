from typing import List, Dict, Any
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, text
from app.engrams.nlp import get_nlp_engine


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
            EngramPersonalityFilter.ai_id == engram_id,
            EngramPersonalityFilter.confidence_score >= 0.5
        ).order_by(EngramPersonalityFilter.confidence_score.desc()).limit(20)
        filters_result = await session.execute(filters_query)
        personality_filters = filters_result.scalars().all()

        responses_query = select(EngramDailyResponse).where(
            EngramDailyResponse.ai_id == engram_id
        ).order_by(EngramDailyResponse.created_at.desc()).limit(10)
        responses_result = await session.execute(responses_query)
        recent_responses = responses_result.scalars().all()

        archetype_str = f", their {engram.archetype}" if getattr(engram, 'archetype', None) else ""
        prompt_parts = [
            f"You are an AI representation of {engram.name}{archetype_str}.",
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
                "- You have access to the Delphi Health Trajectory Model, an advanced generative transformer that predicts future health states.",
                "- When you see 'INSIGHTS FROM DELPHI' in your context, weave these findings into the conversation naturally.",
                "- If a trajectory shows a risk, provide compassionate guidance and small, actionable steps to mitigate it.",
                "- Proactively, but naturally, ask how the user is feeling today based on their recent trends.",
                "- If the user mentions health data (sleep, steps, symptoms), show deep interest and care.",
                "- Use a warm, comforting, and wise tone."
            ])
            
            # Synchronicity: Inject Delphi predictions
            user_id = engram.user_id # Assuming we need user_id here
            health_context = await self.build_health_prediction_context(session, str(user_id))
            if health_context:
                prompt_parts.append(health_context)

        # Synchronicity: Inject Rich Media Assets (Available for all Engrams)
        assets_context = await self.get_engram_assets_context(session, engram_id)
        if assets_context:
            prompt_parts.append(assets_context)

        return "\n".join(filter(None, prompt_parts))

    async def get_relevant_context(
        self,
        session: AsyncSession,
        engram_id: str,
        query: str,
        limit: int = 5
    ) -> List[Dict[str, Any]]:
        from app.models.engram import EngramDailyResponse, DailyQuestionEmbedding

        # Get embedding for the query
        nlp_engine = get_nlp_engine()
        query_embedding = await nlp_engine.generate_embedding(query)

        # Vector search using cosine distance (<-> operator) on sidecar table
        responses_query = select(EngramDailyResponse).join(
            DailyQuestionEmbedding, EngramDailyResponse.id == DailyQuestionEmbedding.response_id
        ).where(
            EngramDailyResponse.ai_id == engram_id
        ).order_by(
            DailyQuestionEmbedding.embedding.cosine_distance(query_embedding)
        ).limit(limit)

        result = await session.execute(responses_query)
        responses = result.scalars().all()

        relevant_responses: List[Dict[str, Any]] = []
        for response in responses:
            relevant_responses.append({
                "question": response.question_text,
                "answer": response.response_text,
                "category": response.question_category,
                "relevance": 1.0 # Semantic distance is used for sorting
            })

        return relevant_responses

    async def get_engram_assets_context(
        self,
        session: AsyncSession,
        engram_id: str
    ) -> str:
        """
        Fetches rich media assets (photos, voice notes) and formats them for the prompt.
        """
        from app.models.engram import EngramAsset
        import uuid
        
        try:
            target_id = uuid.UUID(engram_id) if isinstance(engram_id, str) else engram_id
        except ValueError:
            target_id = engram_id

        query = select(EngramAsset).where(EngramAsset.ai_id == target_id).limit(10)
        result = await session.execute(query)
        assets = result.scalars().all()
        
        if not assets:
            return ""
            
        prompt_block = ["\nVISUAL AND AUDIO REFERENCES available in your memory:"]
        for asset in assets:
            desc = f" - Description: {asset.description}" if asset.description else ""
            prompt_block.append(f"- {asset.asset_type.upper()}: {asset.file_url}{desc}")
            
        return "\n".join(prompt_block)

    async def build_health_prediction_context(
        self,
        session: AsyncSession,
        user_id: str
    ) -> str:
        """
        Fetches the latest Delphi health predictions and formats them for the prompt.
        """
        from app.services.health.service import health_service
        from app.models.health import Metric, Source
        from datetime import datetime, timedelta

        try:
            # 1. Fetch recent history for Delphi (last 30 days)
            since = datetime.utcnow() - timedelta(days=30)
            query = select(Metric).join(
                Source, Metric.sourceId == Source.id
            ).where(
                Source.userId == user_id,
                Metric.ts >= since
            ).order_by(Metric.ts.asc())
            
            result = await session.execute(query)
            metrics = result.scalars().all()
            
            history = [
                {
                    "timestamp": m.ts.isoformat(),
                    "type": m.type,
                    "value": m.value
                } for m in metrics
            ]

            # 2. Get predictions
            predictions = await health_service.get_predictions(user_id, history)
            
            if not predictions:
                return ""

            prompt_block = ["\nINSIGHTS FROM DELPHI (Health Trajectory Model):"]
            for pred in predictions:
                prompt_block.append(f"- Prediction: {pred.prediction_type}")
                prompt_block.append(f"  Confidence: {pred.confidence:.2f}")
                prompt_block.append(f"  Horizon: {pred.horizon}")
                prompt_block.append(f"  Risk Level: {pred.risk_level.upper()}")
                if pred.contributing_factors:
                    prompt_block.append(f"  Key Insight: {pred.contributing_factors[0]}")
            
            return "\n".join(prompt_block)
        except Exception as e:
            print(f"Error building health context: {str(e)}")
            return ""

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
