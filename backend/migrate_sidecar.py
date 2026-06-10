import asyncio
import sys
from sqlalchemy import text
from app.db.session import get_engine

async def migrate_sidecar():
    print("Connecting to database...")
    engine = get_engine()
    
    async with engine.begin() as conn:
        print("1. Dropping embedding column from daily_question_responses (if exists)...")
        await conn.execute(text("ALTER TABLE daily_question_responses DROP COLUMN IF EXISTS embedding"))
        
        print("2. Creating daily_question_embeddings sidecar table...")
        await conn.execute(text("""
            CREATE TABLE IF NOT EXISTS daily_question_embeddings (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                response_id UUID NOT NULL REFERENCES daily_question_responses(id) ON DELETE CASCADE,
                embedding vector(384) NOT NULL,
                created_at TIMESTAMPTZ DEFAULT NOW(),
                UNIQUE(response_id)
            )
        """))
        
        print("3. Ensuring vector extension is enabled...")
        await conn.execute(text("CREATE EXTENSION IF NOT EXISTS vector"))
        
    print("Migration to sidecar complete.")

if __name__ == "__main__":
    if sys.platform == 'win32':
        asyncio.set_event_loop_policy(asyncio.WindowsSelectorEventLoopPolicy())
    asyncio.run(migrate_sidecar())
