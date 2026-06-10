import sys
import os
import asyncio
from dotenv import load_dotenv

sys.path.append(os.path.dirname(os.path.abspath(__file__)))
load_dotenv()

from sqlalchemy import text
from app.db.session import get_engine

async def create_table():
    engine = get_engine()
    async with engine.begin() as conn:
        print("Creating guardian_intercessions table...")
        await conn.execute(text("""
        CREATE TABLE IF NOT EXISTS public.guardian_intercessions (
            id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
            user_id UUID NOT NULL,
            saint_id TEXT NOT NULL,
            description TEXT NOT NULL,
            tool_name TEXT NOT NULL,
            tool_kwargs JSONB NOT NULL,
            status TEXT NOT NULL DEFAULT 'pending',
            execution_result JSONB,
            created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
            updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        );
        """))
        print("Table created successfully!")

if __name__ == "__main__":
    asyncio.run(create_table())
