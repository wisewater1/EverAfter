import asyncio
import os
import sys
import uuid
from sqlalchemy import text, select
from app.db.session import get_session_factory
from app.models.engram import Engram

sys.path.append(os.getcwd())

async def final_fix():
    AsyncSessionLocal = get_session_factory()
    
    # 1. READ VERIFIED USER ID
    USER_ID = uuid.UUID("8e98f16d-5f94-49b2-b35e-c764a75368db")
    USER_EMAIL = "wisewater112345@gmail.com" # From earlier debug output
    
    print(f"--- STARTING FINAL FIX FOR USER {USER_ID} ---", flush=True)
    
    async with AsyncSessionLocal() as session:
        # 2. INSERT INTO PROFILES IF MISSING
        try:
            p_check = await session.execute(text(f"SELECT id FROM profiles WHERE id = '{USER_ID}'"))
            if not p_check.fetchone():
                print(f"Inserting profile for {USER_ID}...", flush=True)
                # Note: We use the columns we found earlier: id, email, full_name, avatar_url
                await session.execute(text(f"INSERT INTO profiles (id, email, full_name) VALUES ('{USER_ID}', '{USER_EMAIL}', 'User')"))
                await session.commit()
                print("Profile inserted successfully.", flush=True)
            else:
                print("Profile already exists.", flush=True)
        except Exception as e:
            print(f"Profile error: {e}", flush=True)
            await session.rollback()

        # 3. SEED ST. RAPHAEL
        try:
            check_q = select(Engram).where(Engram.user_id == USER_ID, Engram.name == "St. Raphael")
            res = await session.execute(check_q)
            existing = res.scalar_one_or_none()
            
            if existing:
                print(f"St. Raphael already exists: {existing.id}", flush=True)
            else:
                print("Seeding St. Raphael...", flush=True)
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
                    training_status="completed",
                    is_ai_active=True # Ensure it's active!
                )
                session.add(new_engram)
                await session.commit()
                print(f"SUCCESS: St. Raphael seeded with ID {new_engram.id}", flush=True)
        except Exception as e:
            print(f"Seeding error: {e}", flush=True)
            await session.rollback()

        # 4. VERIFY
        final_check = await session.execute(select(Engram).where(Engram.name == "St. Raphael"))
        all_raphaels = final_check.scalars().all()
        print(f"Total St. Raphaels in DB: {len(all_raphaels)}", flush=True)
        for r in all_raphaels:
             print(f"  - ID: {r.id}, User: {r.user_id}", flush=True)

    print("--- FINAL FIX COMPLETE ---", flush=True)

if __name__ == "__main__":
    if sys.platform == 'win32':
        asyncio.set_event_loop_policy(asyncio.WindowsSelectorEventLoopPolicy())
    asyncio.run(final_fix())
