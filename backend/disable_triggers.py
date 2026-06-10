import asyncio
import sys
from sqlalchemy import text
from app.db.session import get_engine

async def disable_triggers():
    engine = get_engine()
    async with engine.begin() as conn:
        await conn.execute(text("ALTER TABLE daily_question_responses DISABLE TRIGGER ALL"))
        print("Disabled all triggers on daily_question_responses.")

if __name__ == "__main__":
    if sys.platform == 'win32':
        asyncio.set_event_loop_policy(asyncio.WindowsSelectorEventLoopPolicy())
    asyncio.run(disable_triggers())
