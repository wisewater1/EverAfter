import asyncio
import sys
from sqlalchemy import select
from app.db.session import get_async_session
from app.models.engram import EngramDailyResponse
from app.ai.prompt_builder import get_prompt_builder

async def test_vector_search():
    print("Testing Vector Search...")
    async for session in get_async_session():
        # Get a random engram_id that has embeddings
        query = select(EngramDailyResponse).where(EngramDailyResponse.embedding_generated == True).limit(1)
        result = await session.execute(query)
        sample = result.scalar_one_or_none()
        
        if not sample:
            print("No responses with embeddings found. Is backfill still running?")
            return

        engram_id = str(sample.engram_id)
        test_query = "something about family and values"
        
        print(f"Searching for: '{test_query}' in engram {engram_id}")
        builder = get_prompt_builder()
        context = await builder.get_relevant_context(session, engram_id, test_query, limit=3)
        
        print(f"Found {len(context)} relevant memories:")
        for i, item in enumerate(context):
            print(f"{i+1}. Q: {item['question']}")
            print(f"   A: {item['answer'][:100]}...")
        break

if __name__ == "__main__":
    if sys.platform == 'win32':
        asyncio.set_event_loop_policy(asyncio.WindowsSelectorEventLoopPolicy())
    asyncio.run(test_vector_search())
