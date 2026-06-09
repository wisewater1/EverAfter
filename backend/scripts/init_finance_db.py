import asyncio
import sys
import os

# Add parent directory to path to allow imports from app
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.db.session import get_engine, Base
from app.models.finance import BudgetCategory, BudgetEnvelope, Transaction

async def init_db():
    print("Initializing Finance Database Tables...")
    try:
        engine = get_engine()
        async with engine.begin() as conn:
            # Create all tables
            await conn.run_sync(Base.metadata.create_all)
        print("Success: Finance tables created!")
    except Exception as e:
        print(f"Error initializing database: {e}")

if __name__ == "__main__":
    if sys.platform == 'win32':
        asyncio.set_event_loop_policy(asyncio.WindowsSelectorEventLoopPolicy())
    asyncio.run(init_db())
