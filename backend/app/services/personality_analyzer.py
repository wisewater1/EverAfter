from typing import Dict, List, Any, Optional
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_, func
from datetime import datetime
import json


class PersonalityAnalyzer:
    """
    Multi-layer personality analysis system
    Extracts personality traits across multiple dimensions from responses
    """

    def __init__(self, session: AsyncSession):
        self.session = session

    async def analyze_ai_personality(
        self,
        ai_id: str,
        user_id: str,
        force_reanalysis: bool = False
    ) -> Dict[str, Any]:
        """
        Perform comprehensive personality analysis across all dimensions
        """
        from app.models.engram import DailyQuestionResponse, PersonalityTrait, PersonalityDimension

        # Get all responses for this user
        responses_query = select(DailyQuestionResponse).where(
            DailyQuestionResponse.user_id == user_id
        ).order_by(DailyQuestionResponse.created_at.asc())

        result = await self.session.execute(responses_query)
        responses = result.scalars().all()

        if not responses:
            return {"status": "insufficient_data", "traits_extracted": 0}

        # Get all personality dimensions
        dimensions_query = select(PersonalityDimension).where(
            PersonalityDimension.is_active == True
        ).order_by(PersonalityDimension.depth_level.asc(), PersonalityDimension.dimension_order.asc())

        result = await self.session.execute(dimensions_query)
        dimensions = result.scalars().all()

        traits_extracted = 0

        # Analyze each dimension
        for dimension in dimensions:
            # Get responses relevant to this dimension
            dimension_responses = [
                r for r in responses
                if r.dimension_id == str(dimension.id)
            ]

            if not dimension_responses:
                continue

            # Extract traits for this dimension
            extracted_traits = await self._extract_dimension_traits(
                ai_id,
                dimension,
                dimension_responses
            )

            traits_extracted += len(extracted_traits)

        # Calculate overall personality profile
        profile = await self._build_personality_profile(ai_id)

        return {
            "status": "success",
            "traits_extracted": traits_extracted,
            "dimensions_analyzed": len(dimensions),
            "responses_analyzed": len(responses),
            "profile": profile
        }

    async def _extract_dimension_traits(
        self,
        ai_id: str,
        dimension,
        responses: List
    ) -> List[Dict]:
        """
        Extract personality traits for a specific dimension
        Uses AI/NLP to analyze response patterns
        """
        from app.models.engram import PersonalityTrait
        from app.ai.llm_client import get_llm_client

        if not responses:
            return []

        # Prepare response texts for analysis
        response_texts = [r.response_text for r in responses]
        response_ids = [str(r.id) for r in responses]

        # Use LLM to extract personality traits
        llm = get_llm_client()

        prompt = f"""
        Analyze these responses to identify personality traits for the dimension: {dimension.display_name}

        Dimension Description: {dimension.description}

        Responses:
        {self._format_responses_for_analysis(responses)}

        Extract 3-5 key personality traits that are evident from these responses.
        For each trait, provide:
        1. trait_name: A short descriptor (e.g., "compassionate", "analytical", "risk-averse")
        2. trait_value: A detailed description of how this trait manifests
        3. confidence: A score from 0.0 to 1.0 indicating confidence in this assessment

        Return as JSON array: [{{"trait_name": "", "trait_value": "", "confidence": 0.0}}]
        """

        try:
            # In production, call actual LLM
            # For now, use pattern-based extraction
            traits = await self._pattern_based_extraction(
                dimension.dimension_name,
                responses
            )

            # Save traits to database
            saved_traits = []
            for trait_data in traits:
                trait = PersonalityTrait(
                    ai_id=ai_id,
                    dimension_id=str(dimension.id),
                    trait_name=trait_data["trait_name"],
                    trait_value=trait_data["trait_value"],
                    confidence_score=trait_data["confidence"],
                    supporting_responses=response_ids,
                    extracted_at=datetime.utcnow()
                )

                # Use merge to handle duplicates
                self.session.add(trait)
                saved_traits.append(trait_data)

            await self.session.commit()
            return saved_traits

        except Exception as e:
            print(f"Error extracting traits: {e}")
            return []

    def _format_responses_for_analysis(self, responses: List) -> str:
        """Format responses for LLM analysis"""
        formatted = []
        for i, response in enumerate(responses[:10], 1):  # Limit to 10 for token efficiency
            formatted.append(f"{i}. Q: {response.question_text}")
            formatted.append(f"   A: {response.response_text}\n")
        return "\n".join(formatted)

    async def _pattern_based_extraction(
        self,
        dimension_name: str,
        responses: List
    ) -> List[Dict]:
        """
        Pattern-based trait extraction
        (Fallback when LLM not available)
        """
        traits = []

        # Analyze response patterns
        avg_length = sum(len(r.response_text) for r in responses) / len(responses)
        total_length = sum(len(r.response_text) for r in responses)

        # Response depth analysis
        if avg_length > 300:
            traits.append({
                "trait_name": "thoughtful_communicator",
                "trait_value": "Provides detailed, thoughtful responses with depth and nuance",
                "confidence": 0.75
            })
        elif avg_length < 100:
            traits.append({
                "trait_name": "concise_communicator",
                "trait_value": "Prefers brief, to-the-point communication",
                "confidence": 0.7
            })

        # Emotion detection in text
        emotion_words = self._count_emotion_words([r.response_text for r in responses])
        if emotion_words > len(responses) * 2:
            traits.append({
                "trait_name": "emotionally_expressive",
                "trait_value": "Openly expresses emotions and feelings in communication",
                "confidence": 0.65
            })

        # Dimension-specific patterns
        if dimension_name == "core_values":
            if any("family" in r.response_text.lower() for r in responses):
                traits.append({
                    "trait_name": "family_oriented",
                    "trait_value": "Places high importance on family relationships and connections",
                    "confidence": 0.8
                })

        elif dimension_name == "decision_making":
            if any(word in " ".join([r.response_text.lower() for r in responses])
                   for word in ["careful", "consider", "think", "analyze"]):
                traits.append({
                    "trait_name": "deliberate_decision_maker",
                    "trait_value": "Makes decisions carefully after thorough consideration",
                    "confidence": 0.7
                })

        elif dimension_name == "communication_style":
            question_marks = sum(r.response_text.count("?") for r in responses)
            if question_marks > len(responses) * 0.5:
                traits.append({
                    "trait_name": "inquisitive",
                    "trait_value": "Asks questions and seeks to understand more deeply",
                    "confidence": 0.65
                })

        return traits if traits else [{
            "trait_name": "emerging_pattern",
            "trait_value": "Personality pattern still developing, need more responses",
            "confidence": 0.3
        }]

    def _count_emotion_words(self, texts: List[str]) -> int:
        """Count emotional expression words"""
        emotion_words = {
            "love", "hate", "joy", "sad", "happy", "angry", "excited",
            "worried", "afraid", "proud", "grateful", "hurt", "lonely",
            "anxious", "peaceful", "frustrated", "disappointed", "hopeful"
        }

        count = 0
        combined_text = " ".join(texts).lower()
        for word in emotion_words:
            count += combined_text.count(word)
        return count

    async def _build_personality_profile(self, ai_id: str) -> Dict[str, Any]:
        """
        Build comprehensive personality profile
        """
        from app.models.engram import PersonalityTrait, PersonalityDimension

        profile = {
            "dimensions": {},
            "top_traits": [],
            "completeness": {}
        }

        # Get all traits for this AI
        traits_query = select(PersonalityTrait).where(
            PersonalityTrait.ai_id == ai_id
        ).order_by(PersonalityTrait.confidence_score.desc())

        result = await self.session.execute(traits_query)
        traits = result.scalars().all()

        # Group by dimension
        for trait in traits:
            dim_query = select(PersonalityDimension).where(
                PersonalityDimension.id == trait.dimension_id
            )
            dim_result = await self.session.execute(dim_query)
            dimension = dim_result.scalar_one_or_none()

            if not dimension:
                continue

            dim_name = dimension.dimension_name
            if dim_name not in profile["dimensions"]:
                profile["dimensions"][dim_name] = {
                    "display_name": dimension.display_name,
                    "traits": [],
                    "avg_confidence": 0.0
                }

            profile["dimensions"][dim_name]["traits"].append({
                "name": trait.trait_name,
                "value": trait.trait_value,
                "confidence": trait.confidence_score
            })

        # Calculate average confidence per dimension
        for dim_name, dim_data in profile["dimensions"].items():
            if dim_data["traits"]:
                dim_data["avg_confidence"] = sum(
                    t["confidence"] for t in dim_data["traits"]
                ) / len(dim_data["traits"])

        # Top traits overall
        profile["top_traits"] = [
            {
                "name": t.trait_name,
                "value": t.trait_value,
                "confidence": t.confidence_score
            }
            for t in traits[:10]  # Top 10
        ]

        return profile

    async def associate_traits_with_tasks(self, ai_id: str) -> Dict[str, Any]:
        """
        Create associations between personality traits and task types
        This enables personality-driven task execution
        """
        from app.models.engram import PersonalityTrait, TraitTaskAssociation

        traits_query = select(PersonalityTrait).where(
            PersonalityTrait.ai_id == ai_id,
            PersonalityTrait.confidence_score >= 0.6  # Only confident traits
        )

        result = await self.session.execute(traits_query)
        traits = result.scalars().all()

        associations_created = 0

        for trait in traits:
            # Determine which task types this trait affects
            task_types = self._get_relevant_task_types(trait)

            for task_type in task_types:
                relevance = self._calculate_task_relevance(trait, task_type)

                if relevance > 0.3:  # Threshold for relevance
                    association = TraitTaskAssociation(
                        trait_id=str(trait.id),
                        task_type=task_type,
                        relevance_score=relevance,
                        affects_execution=True,
                        execution_modifier=self._get_execution_modifier(trait, task_type)
                    )

                    self.session.add(association)
                    associations_created += 1

        await self.session.commit()

        return {
            "associations_created": associations_created,
            "traits_analyzed": len(traits)
        }

    def _get_relevant_task_types(self, trait) -> List[str]:
        """Determine which task types a trait is relevant to"""
        relevance_map = {
            "risk_averse": ["doctor_appointment", "prescription_refill"],
            "proactive": ["health_reminder", "lab_results"],
            "detail_oriented": ["doctor_appointment", "insurance_claim"],
            "empathetic": ["email_send", "communication"],
            "formal_communicator": ["email_send"],
            "casual_communicator": ["email_send"],
            "anxious": ["doctor_appointment", "health_reminder"],
            "organized": ["prescription_refill", "doctor_appointment"],
        }

        task_types = relevance_map.get(trait.trait_name, [])

        # If no specific mapping, return general types
        if not task_types:
            task_types = ["custom"]

        return task_types

    def _calculate_task_relevance(self, trait, task_type: str) -> float:
        """Calculate how relevant a trait is to a task type"""
        # This would use ML in production
        # For now, use rule-based scoring
        base_relevance = 0.5

        if task_type == "doctor_appointment":
            if "anxious" in trait.trait_name:
                return 0.9
            if "proactive" in trait.trait_name:
                return 0.8

        elif task_type == "email_send":
            if "communicator" in trait.trait_name:
                return 0.9
            if "empathetic" in trait.trait_name:
                return 0.7

        return base_relevance * trait.confidence_score

    def _get_execution_modifier(self, trait, task_type: str) -> Dict:
        """
        Get execution modifiers based on personality trait
        These modify how the AI executes tasks
        """
        modifiers = {
            "communication_style": "neutral",
            "urgency_level": "normal",
            "detail_level": "standard"
        }

        if "anxious" in trait.trait_name:
            modifiers["communication_style"] = "reassuring"
            modifiers["detail_level"] = "detailed"

        if "formal" in trait.trait_name:
            modifiers["communication_style"] = "formal"

        if "casual" in trait.trait_name:
            modifiers["communication_style"] = "casual"

        if "proactive" in trait.trait_name:
            modifiers["urgency_level"] = "high"

        return modifiers
