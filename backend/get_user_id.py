from sqlalchemy import text
from app.db.session import get_session_factory
import asyncio
import sys
import os

# Add the current directory to sys.path
sys.path.append(os.getcwd())

async def get_user():
    AsyncSessionLocal = get_session_factory()
    print("Checking auth.users table...", flush=True)
    async with AsyncSessionLocal() as session:
        try:
            # Query auth.users directly
            result = await session.execute(text("SELECT id, email FROM auth.users LIMIT 1"))
            row = result.fetchone()
            if row:
                print(f"LEGIT_USER_FOUND: {row[0]} ({row[1]})", flush=True)
            else:
                print("AUTH.USERS TABLE IS EMPTY", flush=True)
        except Exception as e:
            print(f"Error querying auth.users: {e}", flush=True)

if __name__ == "__main__":
    if sys.platform == 'win32':
        asyncio.set_event_loop_policy(asyncio.WindowsSelectorEventLoopPolicy())
    asyncio.run(get_user())
