import json
import os
import numpy as np
from sentence_transformers import SentenceTransformer
from typing import List, Dict, Any, Optional
from datetime import datetime
import uuid

# Path to persistent storage
DATA_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), "data")
MEMORY_FILE = os.path.join(DATA_DIR, "akashic_record.json")

class AkashicRecord:
    _instance = None
    
    def __new__(cls):
        if cls._instance is None:
            cls._instance = super(AkashicRecord, cls).__new__(cls)
            cls._instance._initialize()
        elif not hasattr(cls._instance, 'model'):
            cls._instance._initialize()
        return cls._instance
    
    def _initialize(self):
        print("Initializing Akashic Record (Shared Memory)...")
        # Load model efficiently
        self.model = SentenceTransformer('sentence-transformers/all-MiniLM-L6-v2')
        self.memories: List[Dict[str, Any]] = []
        self.embeddings: Optional[np.ndarray] = None
        self._load_memories()
        
    def _load_memories(self):
        if os.path.exists(MEMORY_FILE):
            try:
                with open(MEMORY_FILE, 'r', encoding='utf-8') as f:
                    data = json.load(f)
                    self.memories = data
                    # Rebuild embeddings from stored text if not stored directly
                    # For simplicity, we re-embed on load or store embeddings as list in JSON
                    # Storing embeddings in JSON is heavy, so we re-embed on startup or use a binary format
                    # Optimization: Check if 'embedding' is in file, otherwise re-compute
                    print(f"Loaded {len(self.memories)} memories from Akashic Record.")
                    
                    # Check if empty
                    if not self.memories:
                        self.embeddings = np.empty((0, 384))
                        return

                    # Compute embeddings for all
                    texts = [m['content'] for m in self.memories]
                    self.embeddings = self.model.encode(texts)
            except Exception as e:
                print(f"Failed to load Akashic Record: {e}")
                self.memories = []
                self.embeddings = np.empty((0, 384))
        else:
            self.memories = []
            self.embeddings = np.empty((0, 384))
            
    def _save_memories(self):
        if not os.path.exists(DATA_DIR):
            os.makedirs(DATA_DIR)
        
        # Save without embeddings to keep JSON readable/small
        with open(MEMORY_FILE, 'w', encoding='utf-8') as f:
            json.dump(self.memories, f, indent=2, default=str)

    def canonize(self, content: str, metadata: Dict[str, Any]):
        """
        Store a new memory in the Akashic Record.
        """
        embedding = self.model.encode([content])[0]
        
        memory_id = str(uuid.uuid4())
        record = {
            "id": memory_id,
            "content": content,
            "metadata": metadata,
            "timestamp": datetime.now().isoformat(),
        }
        
        self.memories.append(record)
        
        # Update embeddings matrix
        if self.embeddings.shape[0] == 0:
            self.embeddings = np.array([embedding])
        else:
            self.embeddings = np.vstack([self.embeddings, embedding])
            
        self._save_memories()
        return record

    def search(self, query: str, limit: int = 5, min_score: float = 0.3, filters: Optional[Dict[str, Any]] = None) -> List[Dict[str, Any]]:
        """
        Semantic search for relevant memories with metadata filtering.
        """
        if not self.memories or (self.embeddings is None) or (self.embeddings.shape[0] == 0):
            return []
            
        query_embedding = self.model.encode([query])[0]
        
        # Cosine similarity
        # A . B / (|A| * |B|)
        norms = np.linalg.norm(self.embeddings, axis=1) * np.linalg.norm(query_embedding)
        # Avoid division by zero
        norms[norms == 0] = 1e-10
        
        scores = np.dot(self.embeddings, query_embedding) / norms
        
        # Get top-k indices (get more than limit to account for filtering)
        # We look at top 50 or all, then filter
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
            
            # Apply Filters (Omni-Context aware)
            if filters:
                meta = memory.get("metadata", {})
                
                # Neural Graph Omni-Context: Allow all global events to bypass strict saint_id silos
                is_global_event = meta.get("type", "") in ["health_event", "finance_event", "life_event", "career_event"]
                
                if not is_global_event:
                    match = True
                    for k, v in filters.items():
                        # Simple equality check for isolated memories
                        if meta.get(k) != v:
                            match = False
                            break
                    if not match:
                        continue

            result = memory.copy()
            result['score'] = float(score)
            results.append(result)
            count += 1
                
        return results

# Singleton instance
akashic = AkashicRecord()
