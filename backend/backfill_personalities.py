import asyncio
import sys
import os

sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from app.db.session import get_session_factory
from app.models.engram import Engram
from sqlalchemy import select
from app.services.personality_synthesizer import generate_value_driven_personality

async def run_backfill():
    print("Starting personality backfill for existing Engrams...")
    try:
        factory = get_session_factory()
        async with factory() as session:
            # Get all engrams that don't have rich personality traits yet, or all of them to refresh 
            query = select(Engram)
            result = await session.execute(query)
            engrams = result.scalars().all()
            
            updated_count = 0
            
            for engram in engrams:
                # If they have no traits, or the traits dict doesn't have the new generated structure
                traits = engram.personality_traits or {}
                if "Core Values" not in traits:
                    print(f"Synthesizing personality for {engram.name}...")
                    
                    try:
                        new_traits = await generate_value_driven_personality(
                            name=engram.name,
                            description=getattr(engram, 'description', 'An autonomous enclave resident.'),
                            relationship='Unknown'
                        )
                        
                        engram.personality_traits = new_traits
                        updated_count += 1
                        print(f"  -> Success! Generated traits: {list(new_traits.keys())}")
                        
                        # Save inside loop to incrementally step through rate limits if any
                        await session.commit()
                        
                        # Small delay to be gentle on local LLMs
                        await asyncio.sleep(2)
                    except Exception as e:
                        print(f"  -> Failed to synthesize for {engram.name}: {e}")
                else:
                    print(f"Skipping {engram.name} - already has synthesized traits.")

            print(f"Backfill complete! Updated {updated_count} Enclave members.")
            
    except Exception as e:
        import traceback
        traceback.print_exc()
        print(f"CRITICAL ERROR in backfill script: {e}")

if __name__ == "__main__":
    asyncio.run(run_backfill())
