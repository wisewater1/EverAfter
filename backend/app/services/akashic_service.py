import asyncio
import json
import os
import uuid
from datetime import datetime
from typing import Any, Dict, List, Optional

import numpy as np

try:
    from sentence_transformers import SentenceTransformer
except Exception:
    SentenceTransformer = None

from app.engrams.nlp import EMBEDDING_DIMENSION, build_fallback_embedding

# Path to persistent storage
DATA_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), "data")
MEMORY_FILE = os.path.join(DATA_DIR, "akashic_record.json")
VECTOR_FILE = os.path.join(DATA_DIR, "akashic_vectors.npy")

os.environ.setdefault("TOKENIZERS_PARALLELISM", "false")
os.environ.setdefault("TQDM_DISABLE", "1")


class AkashicRecord:
    _instance: Optional["AkashicRecord"] = None
    _model: Optional[object] = None
    memories: List[Dict[str, Any]] = []
    embeddings: Optional[np.ndarray] = None

    def __new__(cls):
        if cls._instance is None:
            cls._instance = super(AkashicRecord, cls).__new__(cls)
            cls._instance._initialize()
        elif not hasattr(cls._instance, "_model"):
            cls._instance._initialize()
        return cls._instance

    def _initialize(self):
        print("Initializing Akashic Record (Shared Memory)...")
        self._model = None
        self.memories = []
        self.embeddings = None
        self._load_memories()
        self._load_vectors()

    def _load_vectors(self):
        if os.path.exists(VECTOR_FILE):
            try:
                self.embeddings = np.load(VECTOR_FILE)
                print(f"Loaded {self.embeddings.shape[0]} vectors from Akashic Record.")
            except Exception as exc:
                print(f"Failed to load Akashic vectors: {exc}")
                self.embeddings = None

    @property
    def model(self):
        if SentenceTransformer is None:
            raise RuntimeError("sentence-transformers is unavailable")
        if self._model is None:
            print("Loading Akashic ML model: sentence-transformers/all-MiniLM-L6-v2...")
            self._model = SentenceTransformer("sentence-transformers/all-MiniLM-L6-v2")
        return self._model

    def _encode(self, texts: List[str]) -> np.ndarray:
        if SentenceTransformer is None:
            return np.array([build_fallback_embedding(text) for text in texts], dtype=float)
        return self.model.encode(
            texts,
            show_progress_bar=False,
            convert_to_numpy=True,
        )

    def _load_memories(self):
        if os.path.exists(MEMORY_FILE):
            try:
                with open(MEMORY_FILE, "r", encoding="utf-8") as handle:
                    data = json.load(handle)
                    self.memories = data
                    print(f"Loaded {len(self.memories)} memories from Akashic Record.")
            except Exception as exc:
                print(f"Failed to load Akashic Record: {exc}")
                self.memories = []
        else:
            self.memories = []

    async def _ensure_embeddings(self):
        if (self.embeddings is None or self.embeddings.shape[0] == 0) and self.memories:
            print(f"Generating embeddings for {len(self.memories)} memories...")
            texts = [memory["content"] for memory in self.memories]
            self.embeddings = await asyncio.to_thread(self._encode, texts)
            self._save_vectors()
        elif self.embeddings is None:
            self.embeddings = np.empty((0, EMBEDDING_DIMENSION))

    def _save_vectors(self):
        if not os.path.exists(DATA_DIR):
            os.makedirs(DATA_DIR)
        if self.embeddings is not None:
            np.save(VECTOR_FILE, self.embeddings)

    def _save_memories(self):
        if not os.path.exists(DATA_DIR):
            os.makedirs(DATA_DIR)

        with open(MEMORY_FILE, "w", encoding="utf-8") as handle:
            json.dump(self.memories, handle, indent=2, default=str)

    async def canonize(self, content: str, metadata: Dict[str, Any], user_email: Optional[str] = None):
        await self._ensure_embeddings()

        if user_email:
            metadata["user_email"] = user_email

        embedding = await asyncio.to_thread(self._encode, [content])
        embedding = embedding[0]

        memory_id = str(uuid.uuid4())
        record = {
            "id": memory_id,
            "content": content,
            "metadata": metadata,
            "timestamp": datetime.now().isoformat(),
        }

        self.memories.append(record)

        assert self.embeddings is not None
        if self.embeddings.shape[0] == 0:
            self.embeddings = np.array([embedding])
        else:
            self.embeddings = np.vstack([self.embeddings, embedding])

        self._save_memories()
        self._save_vectors()
        return record

    async def search(
        self,
        query: str,
        limit: int = 5,
        min_score: float = 0.3,
        filters: Optional[Dict[str, Any]] = None,
        user_email: Optional[str] = None,
    ) -> List[Dict[str, Any]]:
        await self._ensure_embeddings()
        if not self.memories or self.embeddings is None or self.embeddings.shape[0] == 0:
            return []

        query_embedding = await asyncio.to_thread(self._encode, [query])
        query_embedding = query_embedding[0]

        norms = np.linalg.norm(self.embeddings, axis=1) * np.linalg.norm(query_embedding)
        norms[norms == 0] = 1e-10
        scores = np.dot(self.embeddings, query_embedding) / norms

        search_limit = min(len(self.memories), 100)
        top_indices = np.argsort(scores)[::-1][:search_limit]

        results = []
        count = 0

        for idx in top_indices:
            if count >= limit:
                break

            score = scores[idx]
            if score < min_score:
                continue

            memory = self.memories[idx]
            meta = memory.get("metadata", {})

            if user_email:
                mem_email = meta.get("user_email")
                is_global = meta.get("type") in ["health_event", "finance_event", "life_event", "career_event"]
                if not is_global and mem_email != user_email:
                    continue

            if filters:
                match = True
                for key, value in filters.items():
                    if meta.get(key) != value:
                        match = False
                        break
                if not match:
                    continue

            result = memory.copy()
            result["score"] = float(score)
            results.append(result)
            count += 1

        return results


akashic = AkashicRecord()
