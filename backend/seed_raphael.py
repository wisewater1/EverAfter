from sqlalchemy import text, select
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
    print("Seeding St. Raphael engram...", flush=True)
    async with AsyncSessionLocal() as session:
        # Find all user_ids in user_daily_progress or daily_question_responses
        user_ids = set()
        
        try:
            res = await session.execute(text("SELECT DISTINCT user_id FROM user_daily_progress"))
            for row in res.fetchall(): user_ids.add(row[0])
            
            res = await session.execute(text("SELECT DISTINCT user_id FROM daily_question_responses"))
            for row in res.fetchall(): user_ids.add(row[0])
        except Exception as e:
            print(f"Error finding user_ids: {e}", flush=True)

        if not user_ids:
            print("No users found in database. Using a placeholder UUID.", flush=True)
            # Use a placeholder if no users found, but this might not match the logged in user
            user_ids.add("00000000-0000-0000-0000-000000000000")

        for user_id_str in user_ids:
            user_id = uuid.UUID(str(user_id_str))
            # Check if Raphael already exists for this user
            check_q = select(Engram).where(Engram.user_id == user_id, Engram.name == "St. Raphael")
            res = await session.execute(check_q)
            if res.scalar_one_or_none():
                print(f"St. Raphael already exists for user {user_id}", flush=True)
                continue

            new_engram = Engram(
                id=uuid.uuid4(),
                user_id=user_id,
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
            print(f"Added St. Raphael for user {user_id}", flush=True)

        try:
            await session.commit()
            print("Seeding complete.", flush=True)
        except Exception as e:
            print(f"FAILED TO COMMIT: {e}", flush=True)
            await session.rollback()

if __name__ == "__main__":
    if sys.platform == 'win32':
        asyncio.set_event_loop_policy(asyncio.WindowsSelectorEventLoopPolicy())
    asyncio.run(seed_raphael())
