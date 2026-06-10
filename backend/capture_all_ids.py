import asyncio
import os
import sys
from sqlalchemy import text
from app.db.session import get_session_factory

sys.path.append(os.getcwd())

async def get_all_ids():
    AsyncSessionLocal = get_session_factory()
    async with AsyncSessionLocal() as session:
        try:
            result = await session.execute(text("SELECT id, email FROM auth.users"))
            rows = result.fetchall()
            with open("all_user_ids.txt", "w") as f:
                for row in rows:
                    f.write(f"{row[0]}|{row[1]}\n")
            print(f"SUCCESS: Captured {len(rows)} users")
        except Exception as e:
            print(f"Error: {e}")

if __name__ == "__main__":
    if sys.platform == 'win32':
        asyncio.set_event_loop_policy(asyncio.WindowsSelectorEventLoopPolicy())
    asyncio.run(get_all_ids())
