import asyncio
import os
import sys

sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from app.db.session import get_session_factory
from app.models.engram import Engram
from sqlalchemy import select

async def run():
    factory = get_session_factory()
    async with factory() as session:
        query = select(Engram)
        result = await session.execute(query)
        engrams = result.scalars().all()
        for e in engrams:
            print(f"ID: {e.id}, Name: {e.name}, Avatar: {e.avatar_url}")

if __name__ == "__main__":
    asyncio.run(run())
