
import asyncio
import sys
from sqlalchemy import text
from app.db.session import engine, get_engine

async def fix_all():
    get_engine() # Initialize engine
    async with engine.begin() as conn:
        # 1. Activate AI for St. Raphael
        await conn.execute(text("UPDATE engrams SET is_ai_active = True WHERE name = 'St. Raphael'"))
        print("AI activated for St. Raphael")
        
        # 2. Check current identity
        res = await conn.execute(text("SELECT user_id FROM daily_question_responses ORDER BY created_at DESC LIMIT 1"))
        user_id = res.scalar()
        print(f"Latest User ID: {user_id}")
        
        # 3. Check engrams
        res = await conn.execute(text("SELECT id, user_id, name, is_ai_active FROM engrams WHERE name = 'St. Raphael'"))
        for row in res.all():
            print(f"Engram: {row}")

if __name__ == "__main__":
    if sys.platform == 'win32':
        asyncio.set_event_loop_policy(asyncio.WindowsSelectorEventLoopPolicy())
    asyncio.run(fix_all())
