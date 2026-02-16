import asyncio
import os
import sys
from sqlalchemy import text
from app.db.session import get_session_factory

# Add the current directory to sys.path
sys.path.append(os.getcwd())

async def list_users():
    AsyncSessionLocal = get_session_factory()
    print("Listing all users in auth.users...", flush=True)
    async with AsyncSessionLocal() as session:
        try:
            # List all columns in auth.users first to be sure
            cols_res = await session.execute(text("SELECT column_name FROM information_schema.columns WHERE table_schema = 'auth' AND table_name = 'users'"))
            cols = [c[0] for c in cols_res.fetchall()]
            print(f"Columns in auth.users: {cols}", flush=True)

            result = await session.execute(text("SELECT id, email FROM auth.users"))
            users = result.fetchall()
            if users:
                print(f"FOUND {len(users)} users:", flush=True)
                for user in users:
                    print(f"- ID: {user.id}, Email: {user.email}", flush=True)
            else:
                print("auth.users table is empty.", flush=True)
        except Exception as e:
            print(f"Error querying auth.users: {e}", flush=True)

if __name__ == "__main__":
    if sys.platform == 'win32':
        asyncio.set_event_loop_policy(asyncio.WindowsSelectorEventLoopPolicy())
    asyncio.run(list_users())
