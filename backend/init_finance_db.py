import asyncio
import sys
import os

# Add backend directory to python path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from app.db.session import get_engine, Base
from app.models.finance import BudgetCategory, BudgetEnvelope, Transaction

async def init_db():
    print("Creating St. Gabriel Finance tables...")
    from app.core.config import settings
    # Force asyncpg driver if incorrectly set to psycopg
    if "postgresql+psycopg" in settings.DATABASE_URL:
        settings.DATABASE_URL = settings.DATABASE_URL.replace("postgresql+psycopg", "postgresql+asyncpg")
        settings.DATABASE_URL = settings.DATABASE_URL.replace("sslmode=require", "ssl=require")
    
    engine = get_engine()
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    print("Tables created successfully!")

if __name__ == "__main__":
    if sys.platform == 'win32':
        asyncio.set_event_loop_policy(asyncio.WindowsSelectorEventLoopPolicy())
    asyncio.run(init_db())
