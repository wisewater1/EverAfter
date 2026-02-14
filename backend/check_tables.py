import asyncio
import sys
from sqlalchemy import text
from app.db.session import AsyncSessionLocal

if sys.platform == 'win32':
    import asyncio
    asyncio.set_event_loop_policy(asyncio.WindowsSelectorEventLoopPolicy())

async def list_tables():
    async with AsyncSessionLocal() as session:
        result = await session.execute(text("SELECT table_name FROM information_schema.tables WHERE table_schema='public'"))
        tables = [row[0] for row in result.fetchall()]
        print("Tables in DB:", tables)

if __name__ == "__main__":
    asyncio.run(list_tables())
