import asyncio
import sys
import os
from sqlalchemy import text

# Add backend to path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from app.db.session import get_engine

async def check_tables():
    from app.core.config import settings
    # Patch URL just like in init script
    if "postgresql+psycopg" in settings.DATABASE_URL:
        settings.DATABASE_URL = settings.DATABASE_URL.replace("postgresql+psycopg", "postgresql+asyncpg")
        settings.DATABASE_URL = settings.DATABASE_URL.replace("sslmode=require", "ssl=require")

    engine = get_engine()
    async with engine.connect() as conn:
        result = await conn.execute(text("SELECT table_name FROM information_schema.tables WHERE table_schema = 'public'"))
        tables = [row[0] for row in result.fetchall()]
        print("Existing tables:", tables)
        
        required = ['budget_categories', 'budget_envelopes', 'finance_transactions']
        missing = [t for t in required if t not in tables]
        
        if missing:
            print(f"MISSING TABLES: {missing}")
        else:
            print("ALL FINANCE TABLES EXIST!")

if __name__ == "__main__":
    if sys.platform == 'win32':
        asyncio.set_event_loop_policy(asyncio.WindowsSelectorEventLoopPolicy())
    asyncio.run(check_tables())
