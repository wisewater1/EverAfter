import asyncio
import sys
from sqlalchemy import text
from app.db.session import get_engine

async def check_columns():
    engine = get_engine()
    async with engine.begin() as conn:
        result = await conn.execute(text("""
            SELECT column_name 
            FROM information_schema.columns 
            WHERE table_name='daily_question_responses'
        """))
        print("Columns in daily_question_responses:")
        for row in result.fetchall():
            print(row[0])

if __name__ == "__main__":
    if sys.platform == 'win32':
        asyncio.set_event_loop_policy(asyncio.WindowsSelectorEventLoopPolicy())
    asyncio.run(check_columns())
