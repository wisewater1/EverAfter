import asyncio
import sys
from sqlalchemy import text
from app.db.session import get_engine

async def recreate_sidecar():
    engine = get_engine()
    async with engine.begin() as conn:
        print("Dropping existing sidecar table...")
        await conn.execute(text("DROP TABLE IF EXISTS daily_question_embeddings CASCADE"))
        print("Creating sidecar table with 384 dimensions...")
        await conn.execute(text("""
            CREATE TABLE daily_question_embeddings (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                response_id UUID NOT NULL REFERENCES daily_question_responses(id) ON DELETE CASCADE,
                embedding vector(384) NOT NULL,
                created_at TIMESTAMPTZ DEFAULT NOW(),
                UNIQUE(response_id)
            )
        """))
        print("Table recreated successfully.")

if __name__ == "__main__":
    if sys.platform == 'win32':
        asyncio.set_event_loop_policy(asyncio.WindowsSelectorEventLoopPolicy())
    asyncio.run(recreate_sidecar())
