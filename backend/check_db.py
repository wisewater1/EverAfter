import asyncio
import sys
import os

sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from app.db.session import get_session_factory
from app.models.engram import Engram
from sqlalchemy import select

async def run():
    try:
        factory = get_session_factory()
        async with factory() as session:
            rows = await session.execute(select(Engram))
            engrams = rows.scalars().all()
            if not engrams:
                print("NO_ENGRAMS_FOUND")
            for e in engrams:
                print(f"ID: {e.id}, Name: {e.name}")
    except Exception as e:
        print(f"ERROR: {e}")

if __name__ == "__main__":
    asyncio.run(run())
