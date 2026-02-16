from sqlalchemy import select
from app.db.session import get_session_factory
from app.models.engram import Engram
import uuid
import asyncio
import sys
import os

# Add the current directory to sys.path
sys.path.append(os.getcwd())

async def seed_raphael():
    AsyncSessionLocal = get_session_factory()
    
    # Read the ID from the file to be 100% sure
    try:
        with open("user_id_full.txt", "r") as f:
            user_id_str = f.read().strip()
        USER_ID = uuid.UUID(user_id_str)
    except Exception as e:
        print(f"Error reading user_id: {e}")
        return

    print(f"Seeding St. Raphael for user {USER_ID}...", flush=True)
    async with AsyncSessionLocal() as session:
        # Check if Raphael already exists
        check_q = select(Engram).where(Engram.user_id == USER_ID, Engram.name == "St. Raphael")
        res = await session.execute(check_q)
        existing = res.scalar_one_or_none()
        
        if existing:
            print(f"St. Raphael already exists: {existing.id}", flush=True)
            return

        new_engram = Engram(
            id=uuid.uuid4(),
            user_id=USER_ID,
            name="St. Raphael",
            description="The Archangel of Healing. A warm, comforting companion focused on your health and well-being.",
            personality_traits={
                "warmth": "Exceptional",
                "wisdom": "Ancient",
                "focus": "Health & Healing"
            },
            training_status="completed"
        )
        session.add(new_engram)
        try:
            await session.commit()
            print(f"SUCCESS: St. Raphael seeded with ID {new_engram.id}", flush=True)
        except Exception as e:
            print(f"COMMIT FAILED: {e}", flush=True)
            await session.rollback()

if __name__ == "__main__":
    if sys.platform == 'win32':
        asyncio.set_event_loop_policy(asyncio.WindowsSelectorEventLoopPolicy())
    asyncio.run(seed_raphael())
