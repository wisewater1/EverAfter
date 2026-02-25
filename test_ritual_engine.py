import asyncio
import json
import sys
import os

# Add the backend path so we can import app modules directly
backend_path = os.path.join(os.path.dirname(__file__), "backend")
sys.path.insert(0, backend_path)

from app.services.ritual_engine import RitualEngine

async def test_ritual_engine():
    print("Initializing RitualEngine...")
    engine = RitualEngine()
    
    print("\nTest 1: Core Saints only")
    participants = ["joseph", "michael"]
    res1 = await engine.generate_ritual("morning_prayer", "Feeling grateful today", participants)
    print("Result 1:", json.dumps(res1, indent=2))
    
    print("\nTest 2: Saints + Family Member Names")
    participants = ["raphael", "gabriel", "Wisea Alexander", "Sarah Jenkins"]
    res2 = await engine.generate_ritual("affirmation", "Blessings for the new year", participants, "some_ancestor_id")
    print("Result 2:", json.dumps(res2, indent=2))
    
    print("\nTest 3: Fallback Template (no LLM)")
    # Force fallback by mocking the LLM to raise an Exception
    class MockLLM:
        async def generate_response(self, prompt):
            raise Exception("Mocked LLM failure")
    engine._llm = MockLLM()
    
    res3 = await engine.generate_ritual("crisis_intercession", "Help me through this", ["michael", "John Doe"])
    print("Result 3:", json.dumps(res3, indent=2))
    
    print("\nDONE.")

if __name__ == "__main__":
    asyncio.run(test_ritual_engine())
