import asyncio
import sys
import uuid
from sqlalchemy import select
from app.db.session import get_async_session
from app.models.engram import Engram
from app.services.interaction_service import interaction_service

async def test_agent_interaction():
    print("Testing Engram-to-Engram Interaction...")
    async for session in get_async_session():
        # Using two existing engrams (Raphael and Gabriel/Test)
        # Fetching any two IDs from the DB
        result = await session.execute(select(Engram).limit(2))
        engrams = result.scalars().all()
        
        if len(engrams) < 2:
            print("FAILURE: Need at least two engrams in the database to test interaction.")
            return
            
        initiator = engrams[0]
        receiver = engrams[1]
        
        print(f"Simulating interaction between {initiator.name} and {receiver.name}...")
        
        interaction = await interaction_service.simulate_interaction(
            session, str(initiator.id), str(receiver.id), interaction_type="board meeting"
        )
        
        if interaction:
            print("-" * 50)
            print(f"SUCCESS: Interaction {interaction.id} created.")
            print(f"Summary: {interaction.summary}")
            print("\nDIALOUGE PREVIEW:")
            for turn in interaction.conversation_log[:2]:
                print(f"{turn['role']}: {turn['content'][:100]}...")
            print("-" * 50)
        else:
            print("FAILURE: Interaction simulation failed.")
        break

if __name__ == "__main__":
    if sys.platform == 'win32':
        asyncio.set_event_loop_policy(asyncio.WindowsSelectorEventLoopPolicy())
    asyncio.run(test_agent_interaction())
