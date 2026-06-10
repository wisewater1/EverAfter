from sqlalchemy import text
from app.db.session import get_session_factory
import asyncio
import sys
import os

sys.path.append(os.getcwd())

async def analyze():
    AsyncSessionLocal = get_session_factory()
    async with AsyncSessionLocal() as session:
        # 1. FK Analysis
        print("@@@ ANALYSIS START @@@", flush=True)
        try:
            sql = """
                SELECT
                    ccu.table_name AS foreign_table,
                    ccu.column_name AS foreign_column
                FROM
                    information_schema.table_constraints AS tc
                    JOIN information_schema.key_column_usage AS kcu
                      ON tc.constraint_name = kcu.constraint_name
                    JOIN information_schema.constraint_column_usage AS ccu
                      ON ccu.constraint_name = tc.constraint_name
                WHERE tc.constraint_type = 'FOREIGN KEY' AND tc.table_name='archetypal_ais' AND kcu.column_name='user_id';
            """
            res = await session.execute(text(sql))
            row = res.fetchone()
            if row: print(f"@@@ FK pointing to {row[0]}({row[1]}) @@@", flush=True)
            else: print("@@@ NO FK FOUND FOR archetypal_ais.user_id @@@", flush=True)
        except Exception as e: print(f"@@@ FK Error: {e} @@@", flush=True)

        # 2. Check all tables with data
        try:
            res = await session.execute(text("SELECT table_name FROM information_schema.tables WHERE table_schema = 'public'"))
            tables = [r[0] for r in res.fetchall()]
            for table in tables:
                try:
                    cnt = (await session.execute(text(f"SELECT COUNT(*) FROM {table}"))).scalar()
                    if cnt > 0:
                        print(f"@@@ TABLE {table} HAS {cnt} ROWS @@@", flush=True)
                        try:
                            uid_res = await session.execute(text(f"SELECT id FROM {table} LIMIT 1"))
                            print(f"@@@ SAMPLE ID FROM {table}: {uid_res.scalar()} @@@", flush=True)
                        except:
                             try:
                                uid_res = await session.execute(text(f"SELECT user_id FROM {table} LIMIT 1"))
                                print(f"@@@ SAMPLE USER_ID FROM {table}: {uid_res.scalar()} @@@", flush=True)
                             except: pass
                except: pass
        except Exception as e: print(f"@@@ Table Check Error: {e} @@@", flush=True)
        print("@@@ ANALYSIS END @@@", flush=True)

if __name__ == "__main__":
    if sys.platform == 'win32':
        asyncio.set_event_loop_policy(asyncio.WindowsSelectorEventLoopPolicy())
    asyncio.run(analyze())
