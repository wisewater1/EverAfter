import asyncio
import sys
from sqlalchemy import text
from app.db.session import AsyncSessionLocal

if sys.platform == 'win32':
    import asyncio
    asyncio.set_event_loop_policy(asyncio.WindowsSelectorEventLoopPolicy())

async def fix_schema():
    print("Fixing DB Schema...")
    async with AsyncSessionLocal() as session:
        try:
            # Drop the constraint pointing to engrams table
            print("Dropping constraint agent_task_queue_engram_id_fkey...")
            await session.execute(text("ALTER TABLE agent_task_queue DROP CONSTRAINT IF EXISTS agent_task_queue_engram_id_fkey"))
            await session.commit()
            print("Constraint dropped successfully.")
            
            # Note: We are not adding the new constraint yet to avoid issues if data is inconsistent,
            # but usually we would:
            # await session.execute(text("ALTER TABLE agent_task_queue ADD CONSTRAINT fk_task_queue_archetypal_ai FOREIGN KEY (engram_id) REFERENCES archetypal_ais(id)"))
            # await session.commit()
            
        except Exception as e:
            print(f"Error fixing schema: {e}")

if __name__ == "__main__":
    asyncio.run(fix_schema())
