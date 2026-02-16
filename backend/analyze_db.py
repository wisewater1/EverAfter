from sqlalchemy import text
from app.db.session import get_session_factory
import asyncio
import sys
import os

sys.path.append(os.getcwd())

async def analyze_db():
    AsyncSessionLocal = get_session_factory()
    async with AsyncSessionLocal() as session:
        # 1. List all public tables and row counts
        try:
            print("Checking all tables...", flush=True)
            res = await session.execute(text("SELECT table_name FROM information_schema.tables WHERE table_schema = 'public'"))
            tables = [r[0] for r in res.fetchall()]
            for table in tables:
                cnt = (await session.execute(text(f"SELECT COUNT(*) FROM {table}"))).scalar()
                if cnt > 0:
                    print(f"TABLE {table}: {cnt} rows", flush=True)
                    # Try to get a sample user_id if present
                    try:
                        uid_res = await session.execute(text(f"SELECT user_id FROM {table} LIMIT 1"))
                        print(f"  SAMPLE USER_ID: {uid_res.scalar()}", flush=True)
                    except: pass
        except Exception as e: print(f"Error checking tables: {e}")

        # 2. Check FKs for archetypal_ais
        try:
            print("\nChecking foreign keys for archetypal_ais...", flush=True)
            sql = """
                SELECT
                    kcu.column_name,
                    ccu.table_name AS foreign_table_name,
                    ccu.column_name AS foreign_column_name
                FROM
                    information_schema.table_constraints AS tc
                    JOIN information_schema.key_column_usage AS kcu
                      ON tc.constraint_name = kcu.constraint_name
                      AND tc.table_schema = kcu.table_schema
                    JOIN information_schema.constraint_column_usage AS ccu
                      ON ccu.constraint_name = tc.constraint_name
                      AND ccu.table_schema = tc.table_schema
                WHERE tc.constraint_type = 'FOREIGN KEY' AND tc.table_name='archetypal_ais';
            """
            res = await session.execute(text(sql))
            for r in res.fetchall():
                print(f"FK {r[0]} -> {r[1]}({r[2]})", flush=True)
        except Exception as e: print(f"Error checking FKs: {e}")

if __name__ == "__main__":
    if sys.platform == 'win32':
        asyncio.set_event_loop_policy(asyncio.WindowsSelectorEventLoopPolicy())
    asyncio.run(analyze_db())
