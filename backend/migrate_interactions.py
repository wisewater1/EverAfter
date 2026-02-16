import asyncio
import sys
from sqlalchemy import text
from app.db.session import get_engine

async def migrate_interactions():
    print("Migrating: Creating agent_interactions table...")
    engine = get_engine()
    async with engine.begin() as conn:
        # Create table if it doesn't exist
        await conn.execute(text("""
            CREATE TABLE IF NOT EXISTS agent_interactions (
                id UUID PRIMARY KEY,
                initiator_id UUID NOT NULL REFERENCES archetypal_ais(id) ON DELETE CASCADE,
                receiver_id UUID NOT NULL REFERENCES archetypal_ais(id) ON DELETE CASCADE,
                interaction_type VARCHAR(50) DEFAULT 'casual',
                conversation_log JSONB DEFAULT '[]'::jsonb,
                shared_memory_ids UUID[] DEFAULT '{}'::uuid[],
                sentiment_score FLOAT DEFAULT 0.0,
                emotional_rapport FLOAT DEFAULT 0.5,
                summary TEXT,
                created_at TIMESTAMPTZ DEFAULT NOW(),
                updated_at TIMESTAMPTZ DEFAULT NOW()
            );
            
            -- Add indexes for performance
            CREATE INDEX IF NOT EXISTS idx_interactions_initiator ON agent_interactions(initiator_id);
            CREATE INDEX IF NOT EXISTS idx_interactions_receiver ON agent_interactions(receiver_id);
        """))
        print("Migration complete: agent_interactions table created.")

if __name__ == "__main__":
    if sys.platform == 'win32':
        asyncio.set_event_loop_policy(asyncio.WindowsSelectorEventLoopPolicy())
    asyncio.run(migrate_interactions())
