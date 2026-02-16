import asyncio
import sys
from sqlalchemy import text
from app.db.session import get_engine

async def enable_trigger():
    engine = get_engine()
    async with engine.begin() as conn:
        print("Enabling trigger_update_ai_dimension_scores...")
        await conn.execute(text("ALTER TABLE daily_question_responses ENABLE TRIGGER trigger_update_ai_dimension_scores"))
        print("Trigger enabled successfully.")

if __name__ == "__main__":
    if sys.platform == 'win32':
        asyncio.set_event_loop_policy(asyncio.WindowsSelectorEventLoopPolicy())
    asyncio.run(enable_trigger())
