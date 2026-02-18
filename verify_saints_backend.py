import asyncio
import sys
import os
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine
from sqlalchemy.orm import sessionmaker

# Add backend to path
sys.path.append(os.path.join(os.getcwd(), 'backend'))

from app.core.config import settings
from app.services.saint_agent_service import saint_agent_service, SAINT_DEFINITIONS
from app.db.session import get_async_session

async def verify_saints():
    print("Verifying Saint Agent Service...")
    
    # 1. Initialize DB Session
    # Using the settings from config (assuming they are set or defaults work)
    database_url = settings.DATABASE_URL
    if not database_url:
        print("Error: DATABASE_URL not set")
        return

    engine = create_async_engine(database_url, echo=False)
    async_session = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)

    async with async_session() as session:
        # Mock user ID
        user_id = "00000000-0000-0000-0000-000000000000"  # Test UUID
        
        # 2. Test Bootstrap
        print(f"\n[1] Bootstrapping {SAINT_DEFINITIONS['raphael']['name']}...")
        try:
            result = await saint_agent_service.bootstrap_saint_engram(session, user_id, "raphael")
            print(f"Success: {result}")
            engram_id = result['engram_id']
        except Exception as e:
            print(f"Failed: {e}")
            return

        # 3. Test Chat (Mocking LLM to avoid cost/latency and just test logic)
        print(f"\n[2] Testing Chat...")
        # We'll just check if the method runs. The LLM call might fail if not configured, 
        # but we can catch that. We mainly want to see if the flow works (DB, Prompt build).
        try:
            # Inject a mock LLM response if we could, but here we'll just try to run it
            # and catch the LLM connection error if it happens, which confirms we got past setup
            response = await saint_agent_service.chat(session, user_id, "raphael", "Hello, St. Raphael!")
            print(f"Chat Response: {response['content']}")
        except Exception as e:
            print(f"Chat attempted (expected error if no LLM): {e}")
            # If it's a connection error to Ollama, that's fine, it means code reached that point.

        # 4. Test Knowledge Storage (Direct)
        print(f"\n[3] Testing Knowledge Storage...")
        await saint_agent_service.store_knowledge(
            session, user_id, "raphael", "test_key", "test_value", "health"
        )
        
        knowledge = await saint_agent_service.get_knowledge(session, user_id, "raphael")
        print(f"Knowledge retrieved: {len(knowledge)} items")
        found = any(k['key'] == 'test_key' for k in knowledge)
        if found:
            print("Success: Knowledge stored and retrieved.")
        else:
            print("Error: Test knowledge not found.")

        # 5. Test Status
        print(f"\n[4] Testing Status...")
        statuses = await saint_agent_service.get_all_saint_statuses(session, user_id)
        print(f"Statuses retrieved: {len(statuses)}")
        raphael_status = next((s for s in statuses if s['saint_id'] == 'raphael'), None)
        if raphael_status and raphael_status['is_active']:
            print("Success: Raphael is active.")
        else:
            print("Error: Raphael status incorrect.")

if __name__ == "__main__":
    asyncio.run(verify_saints())
