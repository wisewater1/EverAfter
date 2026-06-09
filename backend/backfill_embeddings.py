import asyncio
import sys
import logging
from app.db.session import get_async_session
from app.services.embeddings import get_embeddings_service

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

async def main():
    logger.info("Starting embeddings backfill...")
    async for session in get_async_session():
        service = get_embeddings_service()
        total_backfilled = 0
        while True:
            count = await service.backfill_embeddings(session)
            if count == 0:
                break
            total_backfilled += count
        logger.info(f"Backfill complete. Total: {total_backfilled}")
        break # Only need one session

if __name__ == "__main__":
    if sys.platform == 'win32':
        asyncio.set_event_loop_policy(asyncio.WindowsSelectorEventLoopPolicy())
    asyncio.run(main())
