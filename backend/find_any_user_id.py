from sqlalchemy import select
from app.db.session import get_session_factory
from app.models.engram import Engram
import asyncio
import sys
import os

# Add the current directory to sys.path
sys.path.append(os.getcwd())

async def find_user_id():
    AsyncSessionLocal = get_session_factory()
    print("Searching for any engram...", flush=True)
    async with AsyncSessionLocal() as session:
        try:
            result = await session.execute(select(Engram).limit(1))
            engram = result.scalar_one_or_none()
            if engram:
                print(f"FOUND USER_ID: {engram.user_id}", flush=True)
            else:
                print("NO ENGRAMS FOUND", flush=True)
        except Exception as e:
            print(f"Error: {e}", flush=True)

if __name__ == "__main__":
    if sys.platform == 'win32':
        asyncio.set_event_loop_policy(asyncio.WindowsSelectorEventLoopPolicy())
    asyncio.run(find_user_id())
