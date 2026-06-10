from sqlalchemy import text, select
from app.db.session import get_session_factory
import asyncio
import sys
import os

# Add the current directory to sys.path
sys.path.append(os.getcwd())

async def find_user():
    AsyncSessionLocal = get_session_factory()
    print("Searching for user_id in various tables...", flush=True)
    async with AsyncSessionLocal() as session:
        # Check archetypal_ais
        try:
            result = await session.execute(text("SELECT user_id FROM archetypal_ais LIMIT 1"))
            row = result.fetchone()
            if row:
                print(f"FOUND in archetypal_ais: {row[0]}", flush=True)
                return
        except Exception: pass

        # Check ai_conversations
        try:
            result = await session.execute(text("SELECT user_id FROM ai_conversations LIMIT 1"))
            row = result.fetchone()
            if row:
                print(f"FOUND in ai_conversations: {row[0]}", flush=True)
                return
        except Exception: pass

        # Check user_daily_progress
        try:
            result = await session.execute(text("SELECT user_id FROM user_daily_progress LIMIT 1"))
            row = result.fetchone()
            if row:
                print(f"FOUND in user_daily_progress: {row[0]}", flush=True)
                return
        except Exception: pass

        print("NO USER_ID FOUND IN ANY TABLE", flush=True)

if __name__ == "__main__":
    if sys.platform == 'win32':
        asyncio.set_event_loop_policy(asyncio.WindowsSelectorEventLoopPolicy())
    asyncio.run(find_user())
