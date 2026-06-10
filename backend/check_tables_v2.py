import asyncio
import sys
import logging
from sqlalchemy import text
from app.db.session import AsyncSessionLocal

# Suppress SQLAlchemy logging
logging.getLogger('sqlalchemy.engine').setLevel(logging.WARNING)

if sys.platform == 'win32':
    import asyncio
    asyncio.set_event_loop_policy(asyncio.WindowsSelectorEventLoopPolicy())

async def list_tables():
    print("STARTING_COLUMN_CHECK")
    async with AsyncSessionLocal() as session:
        # Check engrams table columns
        result = await session.execute(text("SELECT column_name FROM information_schema.columns WHERE table_name='engrams'"))
        columns = [row[0] for row in result.fetchall()]
        print("ENGRAMS_COLUMNS:", columns)
        
        # Check archetypal_ais table columns just for comparison
        result = await session.execute(text("SELECT column_name FROM information_schema.columns WHERE table_name='archetypal_ais'"))
        columns_arch = [row[0] for row in result.fetchall()]
        print("ARCHETYPAL_AIS_COLUMNS:", columns_arch)

    print("ENDING_COLUMN_CHECK")

if __name__ == "__main__":
    asyncio.run(list_tables())
