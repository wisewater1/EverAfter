import asyncio
import sys
from sqlalchemy import text
from app.db.session import get_engine

async def inspect_full_trigger():
    engine = get_engine()
    async with engine.begin() as conn:
        result = await conn.execute(text("""
            SELECT prosrc 
            FROM pg_proc 
            WHERE proname = 'update_ai_dimension_scores'
        """))
        row = result.fetchone()
        if row:
            print(row[0])
        else:
            print("Trigger function not found.")

if __name__ == "__main__":
    if sys.platform == 'win32':
        asyncio.set_event_loop_policy(asyncio.WindowsSelectorEventLoopPolicy())
    asyncio.run(inspect_full_trigger())
