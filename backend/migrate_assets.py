import asyncio
import sys
from sqlalchemy import text
from app.db.session import get_engine

async def migrate_assets():
    print("Connecting to database...")
    engine = get_engine()
    
    async with engine.begin() as conn:
        print("Creating engram_assets table...")
        await conn.execute(text("""
            CREATE TABLE IF NOT EXISTS engram_assets (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                ai_id UUID NOT NULL REFERENCES archetypal_ais(id) ON DELETE CASCADE,
                user_id UUID NOT NULL,
                asset_type TEXT NOT NULL, -- photo, video, voice_note
                file_url TEXT NOT NULL,
                description TEXT,
                created_at TIMESTAMPTZ DEFAULT NOW()
            )
        """))
        print("Creating index on ai_id...")
        await conn.execute(text("CREATE INDEX IF NOT EXISTS idx_engram_assets_ai_id ON engram_assets(ai_id)"))
        
    print("Migration for engram_assets complete.")

if __name__ == "__main__":
    if sys.platform == 'win32':
        asyncio.set_event_loop_policy(asyncio.WindowsSelectorEventLoopPolicy())
    asyncio.run(migrate_assets())
