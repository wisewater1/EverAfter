import asyncio
import sys
from sqlalchemy import text
from app.db.session import get_engine

async def check_vector_dim():
    engine = get_engine()
    async with engine.begin() as conn:
        result = await conn.execute(text("""
            SELECT atttypmod
            FROM pg_attribute
            WHERE attrelid = 'daily_question_embeddings'::regclass
            AND attname = 'embedding'
        """))
        row = result.fetchone()
        if row:
            # pgvector dimension is atttypmod - 4 (if > 0)
            dim = row[0]
            print(f"Embedding column dimension: {dim}")
        else:
            print("Embedding column not found.")

if __name__ == "__main__":
    if sys.platform == 'win32':
        asyncio.set_event_loop_policy(asyncio.WindowsSelectorEventLoopPolicy())
    asyncio.run(check_vector_dim())
