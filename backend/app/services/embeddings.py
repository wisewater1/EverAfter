import asyncio
import logging
from typing import List, Any
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, update, delete
from sqlalchemy.dialects.postgresql import insert
from app.models.engram import EngramDailyResponse, DailyQuestionEmbedding
from app.engrams.nlp import get_nlp_engine

logger = logging.getLogger(__name__)

class EmbeddingsService:
    def __init__(self):
        self.nlp_engine = get_nlp_engine()

    async def generate_response_embedding(self, session: AsyncSession, response_id: str):
        """Generates and saves embedding for a single response in the sidecar table."""
        query = select(EngramDailyResponse).where(EngramDailyResponse.id == response_id)
        result = await session.execute(query)
        response = result.scalar_one_or_none()

        if not response:
            logger.warning(f"Response {response_id} not found for embedding generation.")
            return

        # Combine question and response for better semantic context
        text_to_embed = f"{response.question_text}\n{response.response_text}"
        embedding_vec = await self.nlp_engine.generate_embedding(text_to_embed)

        # Upsert into sidecar table
        stmt = insert(DailyQuestionEmbedding).values(
            response_id=response_id,
            embedding=embedding_vec
        ).on_conflict_do_update(
            index_elements=['response_id'],
            set_={'embedding': embedding_vec}
        )
        
        await session.execute(stmt)
        response.embedding_generated = True
        await session.commit()
        logger.info(f"Generated sidecar embedding for response {response_id}")

    async def backfill_embeddings(self, session: AsyncSession, batch_size: int = 50):
        """Backfills embeddings for all responses that don't have them in the sidecar table."""
        # Join to find responses without embeddings
        query = select(EngramDailyResponse).outerjoin(
            DailyQuestionEmbedding, EngramDailyResponse.id == DailyQuestionEmbedding.response_id
        ).where(
            DailyQuestionEmbedding.id == None
        ).limit(batch_size)

        result = await session.execute(query)
        responses = result.scalars().all()

        if not responses:
            logger.info("No responses to backfill.")
            return 0

        logger.info(f"Backfilling {len(responses)} responses into sidecar...")
        
        texts_to_embed = [f"{r.question_text}\n{r.response_text}" for r in responses]
        embeddings_vecs = await self.nlp_engine.generate_embeddings_batch(texts_to_embed)

        for i, response in enumerate(responses):
            stmt = insert(DailyQuestionEmbedding).values(
                response_id=response.id,
                embedding=embeddings_vecs[i]
            ).on_conflict_do_nothing()
            await session.execute(stmt)
            response.embedding_generated = True

        await session.commit()
        logger.info(f"Successfully backfilled {len(responses)} embeddings into sidecar.")
        return len(responses)

embeddings_service = EmbeddingsService()

def get_embeddings_service() -> EmbeddingsService:
    return embeddings_service
