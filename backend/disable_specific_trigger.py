import asyncio
import sys
from sqlalchemy import text
from app.db.session import get_engine

async def disable_specific_trigger():
    engine = get_engine()
    async with engine.begin() as conn:
        try:
            await conn.execute(text("ALTER TABLE daily_question_responses DISABLE TRIGGER trigger_update_ai_dimension_scores"))
            print("Disabled trigger_update_ai_dimension_scores successfully.")
        except Exception as e:
            print(f"Failed to disable trigger: {e}")

if __name__ == "__main__":
    if sys.platform == 'win32':
        asyncio.set_event_loop_policy(asyncio.WindowsSelectorEventLoopPolicy())
    asyncio.run(disable_specific_trigger())
