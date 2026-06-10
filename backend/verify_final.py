from sqlalchemy import text
from app.db.session import get_session_factory
import asyncio
import sys
import os

sys.path.append(os.getcwd())

async def verify():
    AsyncSessionLocal = get_session_factory()
    async with AsyncSessionLocal() as session:
        res = await session.execute(text("SELECT id, name, user_id, is_ai_active FROM archetypal_ais WHERE name = 'St. Raphael'"))
        rows = res.fetchall()
        print("!!! VERIFICATION !!!")
        if rows:
            for row in rows:
                print(f"FOUND: ID={row[0]}, Name={row[1]}, User={row[2]}, Active={row[3]}")
        else:
            print("NOT FOUND: St. Raphael engram is still missing.")
        
        pres = await session.execute(text("SELECT id, email FROM profiles"))
        prows = pres.fetchall()
        print(f"PROFILES COUNT: {len(prows)}")
        for r in prows:
            print(f" PROFILE: {r[0]} ({r[1]})")

if __name__ == "__main__":
    if sys.platform == 'win32':
        asyncio.set_event_loop_policy(asyncio.WindowsSelectorEventLoopPolicy())
    asyncio.run(verify())
