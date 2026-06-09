from sqlalchemy import text
from app.db.session import get_session_factory
import asyncio
import sys
import os

# Add the current directory to sys.path to assert imports work
sys.path.append(os.getcwd())

async def list_users():
    AsyncSessionLocal = get_session_factory()
    print("Starting database check...", flush=True)
    try:
        async with AsyncSessionLocal() as session:
            print("Session created. checking tables...", flush=True)
            # Check public tables
            result = await session.execute(text("SELECT table_name FROM information_schema.tables WHERE table_schema = 'public'"))
            tables = result.fetchall()
            print("Public tables:", [t[0] for t in tables], flush=True)

            # Check auth schema tables
            try:
                result = await session.execute(text("SELECT table_name FROM information_schema.tables WHERE table_schema = 'auth'"))
                auth_tables = result.fetchall()
                print("Auth tables:", [t[0] for t in auth_tables], flush=True)
            except Exception as e:
                print(f"Failed to list auth tables: {e}", flush=True)

            # Try to query auth.users
            try:
                print("Querying auth.users...", flush=True)
                result = await session.execute(text("SELECT id, email FROM auth.users"))
                users = result.fetchall()
                print(f"Found {len(users)} users in auth.users:", flush=True)
                for user in users:
                    print(f" - ID: {user.id}, Email: {user.email}", flush=True)
            except Exception as e:
                print(f"Failed to query auth.users: {e}", flush=True)
                
    except Exception as e:
        print(f"Critical Session error: {e}", flush=True)

if __name__ == "__main__":
    if sys.platform == 'win32':
        asyncio.set_event_loop_policy(asyncio.WindowsSelectorEventLoopPolicy())
    asyncio.run(list_users())
