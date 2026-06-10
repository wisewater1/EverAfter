import asyncio
import sys
from sqlalchemy import text
from app.db.session import get_engine

async def get_valid_ids():
    engine = get_engine()
    async with engine.begin() as conn:
        result = await conn.execute(text("SELECT id, user_id FROM archetypal_ais LIMIT 1"))
        row = result.fetchone()
        if row:
            print(f"VALID_AI_ID: {row[0]}")
            print(f"VALID_USER_ID: {row[1]}")
        else:
            print("No valid ids found.")

if __name__ == "__main__":
    if sys.platform == 'win32':
        asyncio.set_event_loop_policy(asyncio.WindowsSelectorEventLoopPolicy())
    asyncio.run(get_valid_ids())
