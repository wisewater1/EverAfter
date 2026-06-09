import asyncio
import sys
import os

sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from app.db.session import get_session_factory
from app.services.interaction_service import interaction_service

async def run():
    try:
        factory = get_session_factory()
        async with factory() as session:
            print("Triggering interaction...")
            initiator = "a5f238d9-2d73-4294-86b2-671dc1d7ea59" # Test Engram
            receiver = "63327b1b-14a7-4e75-bb93-8c09f5902d3c" # Aurora
            
            interaction = await interaction_service.simulate_interaction(
                session, initiator, receiver, "casual"
            )
            print(f"Success! Interaction ID: {interaction.id}")
            print(f"Summary: {interaction.summary}")
    except Exception as e:
        print(f"ERROR: {e}")

if __name__ == "__main__":
    asyncio.run(run())
