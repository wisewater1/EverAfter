import asyncio
import os
import sys
from sqlalchemy import text
from app.db.session import get_session_factory

sys.path.append(os.getcwd())

async def get_id():
    AsyncSessionLocal = get_session_factory()
    async with AsyncSessionLocal() as session:
        try:
            result = await session.execute(text("SELECT id FROM auth.users LIMIT 1"))
            row = result.fetchone()
            if row:
                with open("user_id_full.txt", "w") as f:
                    f.write(str(row[0]))
                print(f"SUCCESS: Captured {row[0]}")
            else:
                print("FAILURE: No users found in auth.users")
        except Exception as e:
            print(f"Error: {e}")

if __name__ == "__main__":
    if sys.platform == 'win32':
        asyncio.set_event_loop_policy(asyncio.WindowsSelectorEventLoopPolicy())
    asyncio.run(get_id())
