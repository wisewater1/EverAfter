import asyncio
import sys
from sqlalchemy import text
from app.db.session import get_engine

async def check_ai_columns():
    engine = get_engine()
    async with engine.begin() as conn:
        result = await conn.execute(text("SELECT column_name FROM information_schema.columns WHERE table_name='archetypal_ais'"))
        print("Columns in archetypal_ais:")
        for row in result.fetchall():
            print(row[0])

if __name__ == "__main__":
    if sys.platform == 'win32':
        asyncio.set_event_loop_policy(asyncio.WindowsSelectorEventLoopPolicy())
    asyncio.run(check_ai_columns())
