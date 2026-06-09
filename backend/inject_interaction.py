import asyncio
import sys
import os
import uuid
import random
from datetime import datetime

sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from app.db.session import get_session_factory
from app.models.interaction import AgentInteraction

async def run():
    try:
        factory = get_session_factory()
        async with factory() as session:
            initiator = uuid.UUID("a5f238d9-2d73-4294-86b2-671dc1d7ea59") # Test Engram
            receiver = uuid.UUID("63327b1b-14a7-4e75-bb93-8c09f5902d3c") # Aurora
            
            interaction = AgentInteraction(
                initiator_id=initiator,
                receiver_id=receiver,
                interaction_type="casual",
                conversation_log=[
                    {"role": "Test Engram", "content": "Hello Aurora! How are the gardens today?"},
                    {"role": "Aurora", "content": "Beautiful as ever. The sunlight was perfect for the roses."}
                ],
                summary="Test Engram and Aurora discussed the perfect sunlight in the gardens today.",
                emotional_rapport=0.85
            )
            session.add(interaction)
            await session.commit()
            print("Successfully injected mock interaction into Society Feed!")
            
    except Exception as e:
        print(f"ERROR: {e}")

if __name__ == "__main__":
    asyncio.run(run())
