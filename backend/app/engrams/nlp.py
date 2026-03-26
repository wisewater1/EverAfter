from __future__ import annotations

import asyncio
import hashlib
import math
from functools import lru_cache
from typing import Any, Dict, List

EMBEDDING_DIMENSION = 384


def build_fallback_embedding(text: str, dimension: int = EMBEDDING_DIMENSION) -> List[float]:
    digest = hashlib.sha256(text.encode("utf-8")).digest()
    values: List[float] = []
    counter = 0

    while len(values) < dimension:
        block = hashlib.sha256(digest + counter.to_bytes(4, "big")).digest()
        for idx in range(0, len(block), 4):
            chunk = block[idx:idx + 4]
            if len(chunk) < 4:
                continue
            integer = int.from_bytes(chunk, "big", signed=False)
            values.append((integer / 0xFFFFFFFF) * 2.0 - 1.0)
            if len(values) >= dimension:
                break
        counter += 1

    magnitude = math.sqrt(sum(value * value for value in values)) or 1.0
    return [value / magnitude for value in values]


@lru_cache()
def _get_sentence_transformer_cls():
    try:
        from sentence_transformers import SentenceTransformer
    except Exception:
        return None
    return SentenceTransformer


@lru_cache()
def _get_torch_module():
    try:
        import torch
    except Exception:
        return None
    return torch


class NLPEngine:
    def __init__(self, model_name: str = "sentence-transformers/all-MiniLM-L6-v2"):
        self.model_name = model_name
        self._model = None
        torch = _get_torch_module()
        self._device = "cuda" if torch and torch.cuda.is_available() else "cpu"
        self._ml_available = _get_sentence_transformer_cls() is not None
        if self._ml_available:
            print(f"NLPEngine initialized. Device: {self._device}")
        else:
            print("NLPEngine initialized in degraded mode (ML extras unavailable).")

    @property
    def model(self) -> Any:
        sentence_transformer_cls = _get_sentence_transformer_cls()
        if sentence_transformer_cls is None:
            raise RuntimeError("sentence-transformers is unavailable")
        if self._model is None:
            print(f"Loading ML model: {self.model_name}...")
            self._model = sentence_transformer_cls(self.model_name, device=self._device)
            print("Model loaded successfully.")
        return self._model

    async def generate_embedding(self, text: str) -> List[float]:
        if not self._ml_available:
            return build_fallback_embedding(text)
        loop = asyncio.get_event_loop()
        embedding = await loop.run_in_executor(
            None,
            lambda: self.model.encode(text, convert_to_tensor=False)
        )
        return embedding.tolist()

    async def generate_embeddings_batch(self, texts: List[str]) -> List[List[float]]:
        if not self._ml_available:
            return [build_fallback_embedding(text) for text in texts]
        loop = asyncio.get_event_loop()
        embeddings = await loop.run_in_executor(
            None,
            lambda: self.model.encode(texts, convert_to_tensor=False, batch_size=32)
        )
        return [emb.tolist() for emb in embeddings]

    async def understand_question(self, question: str) -> Dict[str, Any]:
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
