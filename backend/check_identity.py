
import asyncio
from sqlalchemy import text
from app.db.session import engine

async def check_user():
    async with engine.connect() as conn:
        # Check for latest response to get user_id
        res = await conn.execute(text("SELECT user_id FROM daily_question_responses ORDER BY created_at DESC LIMIT 1"))
        user_id = res.scalar()
        print(f"Latest User ID from responses: {user_id}")
        
        # Check for Raphael engram
        res = await conn.execute(text("SELECT id, user_id, name FROM engrams WHERE name = 'St. Raphael'"))
        engrams = res.all()
        for e in engrams:
            print(f"Found St. Raphael: ID={e[0]}, UserID={e[1]}, Name={e[2]}")
            
if __name__ == "__main__":
    import asyncio
    import sys
    if sys.platform == 'win32':
        asyncio.set_event_loop_policy(asyncio.WindowsSelectorEventLoopPolicy())
    asyncio.run(check_user())
