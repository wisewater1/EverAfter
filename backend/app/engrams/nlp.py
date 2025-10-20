from typing import Dict, List
import asyncio
from functools import lru_cache
from sentence_transformers import SentenceTransformer
import torch


class NLPEngine:
    def __init__(self, model_name: str = "sentence-transformers/all-MiniLM-L6-v2"):
        self.model_name = model_name
        self._model = None
        self._device = "cuda" if torch.cuda.is_available() else "cpu"

    @property
    def model(self):
        if self._model is None:
            self._model = SentenceTransformer(self.model_name, device=self._device)
        return self._model

    async def generate_embedding(self, text: str) -> List[float]:
        loop = asyncio.get_event_loop()
        embedding = await loop.run_in_executor(
            None,
            lambda: self.model.encode(text, convert_to_tensor=False)
        )
        return embedding.tolist()

    async def generate_embeddings_batch(self, texts: List[str]) -> List[List[float]]:
        loop = asyncio.get_event_loop()
        embeddings = await loop.run_in_executor(
            None,
            lambda: self.model.encode(texts, convert_to_tensor=False, batch_size=32)
        )
        return [emb.tolist() for emb in embeddings]

    async def understand_question(self, question: str) -> Dict[str, any]:
        question_lower = question.lower()

        intents = {
            "values": ["value", "principle", "believe", "important", "matter"],
            "memories": ["memory", "remember", "story", "time when", "recall"],
            "habits": ["habit", "routine", "daily", "usually", "often"],
            "preferences": ["favorite", "like", "prefer", "enjoy", "love"],
            "beliefs": ["belief", "faith", "think", "feel about", "opinion"],
            "communication_style": ["talk", "communicate", "express", "say", "speak"],
            "humor": ["funny", "laugh", "joke", "humor", "amusing"],
            "relationships": ["relationship", "friend", "family", "people", "others"],
            "goals": ["goal", "dream", "want", "aspire", "hope"],
            "experiences": ["experience", "happened", "went through", "faced", "encountered"],
        }

        detected_intent = "general"
        for intent, keywords in intents.items():
            if any(keyword in question_lower for keyword in keywords):
                detected_intent = intent
                break

        return {
            "intent": detected_intent,
            "question": question,
            "category": detected_intent,
        }


@lru_cache()
def get_nlp_engine() -> NLPEngine:
    from app.core.config import settings
    return NLPEngine(settings.HF_MODEL_NAME)
