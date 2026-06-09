import asyncio
import os
import sys
import uuid
from sqlalchemy import text, select
from app.db.session import get_session_factory
from app.models.engram import Engram

sys.path.append(os.getcwd())

async def seed_it():
    AsyncSessionLocal = get_session_factory()
    
    # READ FROM FILE TO AVOID TRUNCATION ISSUES
    try:
        with open("all_user_ids.txt", "r") as f:
            line = f.readline().strip()
            user_id_str = line.split("|")[0]
            USER_ID = uuid.UUID(user_id_str)
            print(f"USING USER_ID: {USER_ID}")
    except Exception as e:
        print(f"Error reading user_id: {e}")
        return

    async with AsyncSessionLocal() as session:
        # Check profiles table first to ensure User ID is valid for FK
        try:
            p_res = await session.execute(text(f"SELECT id FROM profiles WHERE id = '{USER_ID}'"))
            if not p_res.fetchone():
                print(f"WARNING: User ID {USER_ID} NOT FOUND in profiles table. Seeding might fail FK constraint.")
                # We'll try anyway if there's no FK to profiles.
        except: pass

        # Check if Raphael exists
        check_q = select(Engram).where(Engram.user_id == USER_ID, Engram.name == "St. Raphael")
        res = await session.execute(check_q)
        if res.scalar_one_or_none():
            print("St. Raphael already exists.")
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
            print(f"SUCCESS: St. Raphael seeded with ID {new_engram.id}")
        except Exception as e:
            print(f"COMMIT FAILED AGAIN: {e}")
            await session.rollback()

if __name__ == "__main__":
    if sys.platform == 'win32':
        asyncio.set_event_loop_policy(asyncio.WindowsSelectorEventLoopPolicy())
    asyncio.run(seed_it())
