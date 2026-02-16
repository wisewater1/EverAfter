import asyncio
import sys
from sqlalchemy import text
from app.db.session import get_engine

async def migrate():
    print("Connecting to database...")
    engine = get_engine()
    
    async with engine.begin() as conn:
        print("Enabling pgvector extension...")
        await conn.execute(text("CREATE EXTENSION IF NOT EXISTS vector"))
        
        print("Checking for embedding column in daily_question_responses...")
        # Check if column exists
        result = await conn.execute(text("""
            SELECT column_name 
            FROM information_schema.columns 
            WHERE table_name='daily_question_responses' AND column_name='embedding'
        """))
        if not result.fetchone():
            print("Adding embedding column (384 dimensions for all-MiniLM-L6-v2)...")
            await conn.execute(text("ALTER TABLE daily_question_responses ADD COLUMN embedding vector(384)"))
            print("Column added.")
        else:
            print("Embedding column already exists.")
            
    print("Migration complete.")

if __name__ == "__main__":
    if sys.platform == 'win32':
        asyncio.set_event_loop_policy(asyncio.WindowsSelectorEventLoopPolicy())
    asyncio.run(migrate())
