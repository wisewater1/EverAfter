import asyncio
from sqlalchemy import select
from app.db.session import get_async_session
from app.models.engram import Engram
from uuid import UUID

async def diagnose():
    print("--- Starting Diagnosis ---")
    try:
        from app.db.session import get_session_factory
        print("Imports successful")
        
        async_session_factory = get_session_factory()
        if async_session_factory is None:
            print("FAILED: Session factory is None")
            return
            
        async with async_session_factory() as session:
            print("Session created")
            # Test query
            from app.models.engram import Engram
            query = select(Engram).limit(1)
            result = await session.execute(query)
            engram = result.scalar_one_or_none()
            print(f"Query successful, found engram: {engram.name if engram else 'None'}")
            
    except Exception as e:
        print(f"DIAGNOSIS FAILED: {type(e).__name__}: {str(e)}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    asyncio.run(diagnose())
