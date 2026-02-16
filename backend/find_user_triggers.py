import asyncio
import sys
from sqlalchemy import text
from app.db.session import get_engine

async def find_user_triggers():
    engine = get_engine()
    async with engine.begin() as conn:
        result = await conn.execute(text("""
            SELECT tgname 
            FROM pg_trigger 
            WHERE tgrelid = 'daily_question_responses'::regclass 
            AND tgisinternal = false
        """))
        print("User Triggers on daily_question_responses:")
        for row in result.fetchall():
            print(row[0])

if __name__ == "__main__":
    if sys.platform == 'win32':
        asyncio.set_event_loop_policy(asyncio.WindowsSelectorEventLoopPolicy())
    asyncio.run(find_user_triggers())
