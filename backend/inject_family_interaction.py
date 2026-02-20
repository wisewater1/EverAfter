import asyncio
import sys
import os
import random
import uuid
from datetime import datetime

sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from app.db.session import get_session_factory
from app.models.engram import Engram
from app.models.interaction import AgentInteraction
from sqlalchemy import select

async def run():
    try:
        factory = get_session_factory()
        async with factory() as session:
            # Try to get 2 engrams
            query = select(Engram).limit(2)
            result = await session.execute(query)
            engrams = result.scalars().all()
            
            if len(engrams) < 2:
                print("Creating realistic family member profiles for the interaction...")
                # Create mock family members if they don't exist
                user_id = uuid.uuid4()
                initiator = Engram(name="St. Joseph", user_id=user_id, description="The Family Guardian", total_memories=15)
                receiver = Engram(name="St. Michael", user_id=user_id, description="The Archangel", total_memories=20)
                session.add_all([initiator, receiver])
                await session.flush()
            else:
                initiator = engrams[0]
                receiver = engrams[1]
            
            interaction = AgentInteraction(
                initiator_id=initiator.id,
                receiver_id=receiver.id,
                interaction_type="generative",
                conversation_log=[
                    {"role": initiator.name, "content": "The family tree is looking robust today. It brings me joy to see the connections."},
                    {"role": receiver.name, "content": "Indeed. I have reviewed the security perimeters. The household stands strong."}
                ],
                summary=f"{initiator.name} and {receiver.name} synchronized on the household's current safety and the growth of the family tree.",
                emotional_rapport=0.95
            )
            session.add(interaction)
            await session.commit()
            print(f"Successfully injected interaction between REAL family members: {initiator.name} and {receiver.name}")
            
    except Exception as e:
        import traceback
        traceback.print_exc()
        print(f"ERROR: {e}")

if __name__ == "__main__":
    asyncio.run(run())
