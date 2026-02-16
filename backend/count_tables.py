from sqlalchemy import text
from app.db.session import get_session_factory
import asyncio
import sys
import os

# Add the current directory to sys.path
sys.path.append(os.getcwd())

async def count_tables():
    AsyncSessionLocal = get_session_factory()
    print("Counting records in all public tables...", flush=True)
    async with AsyncSessionLocal() as session:
        result = await session.execute(text("SELECT table_name FROM information_schema.tables WHERE table_schema = 'public'"))
        tables = [row[0] for row in result.fetchall()]
        
        for table in tables:
            try:
                count_res = await session.execute(text(f"SELECT COUNT(*) FROM {table}"))
                count = count_res.scalar()
                print(f"Table {table}: {count} rows", flush=True)
                if count > 0 and 'user_id' in (await session.execute(text(f"SELECT column_name FROM information_schema.columns WHERE table_name = '{table}'"))).scalars().all():
                     user_res = await session.execute(text(f"SELECT user_id FROM {table} LIMIT 1"))
                     print(f"  Sample USER_ID from {table}: {user_res.scalar()}", flush=True)
            except Exception as e:
                print(f"Error counting {table}: {e}", flush=True)

if __name__ == "__main__":
    if sys.platform == 'win32':
        asyncio.set_event_loop_policy(asyncio.WindowsSelectorEventLoopPolicy())
    asyncio.run(count_tables())
