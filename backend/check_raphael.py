import asyncio
import sys
import os

# Add the current directory to sys.path to assert imports work
sys.path.append(os.getcwd())

from sqlalchemy import select
from app.db.session import get_session_factory
from app.models.engram import Engram

async def check_raphael():
    AsyncSessionLocal = get_session_factory()
    print("Starting check...", flush=True)
    async with AsyncSessionLocal() as session:
        query = select(Engram).where(Engram.name.ilike("%St. Raphael%"))
        result = await session.execute(query)
        engrams = result.scalars().all()
        
        if engrams:
            print(f"FOUND {len(engrams)} engrams matching 'St. Raphael':", flush=True)
            for engram in engrams:
                print(f" - ID: {engram.id}, UserID: {engram.user_id}, Name: {engram.name}", flush=True)
        else:
            print("MISSING: No engrams matching 'St. Raphael' found in database.", flush=True)

if __name__ == "__main__":
    # Windows selector event loop policy if needed
    if sys.platform == 'win32':
        asyncio.set_event_loop_policy(asyncio.WindowsSelectorEventLoopPolicy())
        
    asyncio.run(check_raphael())
