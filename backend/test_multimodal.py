import asyncio
import sys
import uuid
from sqlalchemy import select, text
from app.db.session import get_async_session
from app.models.engram import ArchetypalAI, EngramAsset
from app.ai.prompt_builder import get_prompt_builder

async def test_multimodal():
    print("Testing Multi-Modal Integration...")
    async for session in get_async_session():
        # Use existing valid IDs from the database
        user_id = uuid.UUID("8e98f16d-5f94-49b2-b335-23d63ee0649f")
        ai_id = uuid.UUID("a5f238d9-2d73-4294-86b2-671dc1d7ea59")
        
        print(f"Adding test assets for AI: {ai_id}")
        
        assets = [
            ("photo", "https://example.com/family_photo.jpg", "A picture of the whole family at the lake during summer 2019."),
            ("voice_note", "https://example.com/childhood_song.mp3", "A recording of them singing a lullaby they remembered from childhood.")
        ]
        
        asset_ids = []
        for atype, url, desc in assets:
            asset = EngramAsset(
                ai_id=ai_id,
                user_id=user_id,
                asset_type=atype,
                file_url=url,
                description=desc
            )
            session.add(asset)
            await session.commit()
            await session.refresh(asset)
            asset_ids.append(asset.id)
            print(f"Added {atype} asset.")
            
        print("\nVerifying System Prompt Integration...")
        builder = get_prompt_builder()
        prompt = await builder.build_engram_system_prompt(session, str(ai_id))
        
        print("-" * 50)
        print("GENERATED PROMPT (fragment):")
        # Look for the visual references section
        if "VISUAL AND AUDIO REFERENCES" in prompt:
            parts = prompt.split("VISUAL AND AUDIO REFERENCES")
            print("... VISUAL AND AUDIO REFERENCES" + parts[1][:300] + " ...")
            print("-" * 50)
            print("SUCCESS: Assets found in prompt.")
        else:
            print(prompt)
            print("-" * 50)
            print("FAILURE: Assets NOT found in prompt.")
            
        # Cleanup
        for aid in asset_ids:
            await session.execute(text(f"DELETE FROM engram_assets WHERE id = '{aid}'"))
        await session.commit()
        print("\nCleanup complete.")
        break

if __name__ == "__main__":
    if sys.platform == 'win32':
        asyncio.set_event_loop_policy(asyncio.WindowsSelectorEventLoopPolicy())
    asyncio.run(test_multimodal())
