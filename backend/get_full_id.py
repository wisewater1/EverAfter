import asyncio
import os
import sys
from sqlalchemy import text
from app.db.session import get_session_factory

sys.path.append(os.getcwd())

async def list_users():
    AsyncSessionLocal = get_session_factory()
    async with AsyncSessionLocal() as session:
        try:
            result = await session.execute(text("SELECT id FROM auth.users"))
            users = result.fetchall()
            for user in users:
                print(f"FULL_ID: {user[0]}")
        except Exception as e:
            print(f"Error: {e}")

if __name__ == "__main__":
    if sys.platform == 'win32':
        asyncio.set_event_loop_policy(asyncio.WindowsSelectorEventLoopPolicy())
    asyncio.run(list_users())
