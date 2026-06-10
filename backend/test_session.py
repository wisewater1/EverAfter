import asyncio
import sys
if sys.platform == 'win32':
    asyncio.set_event_loop_policy(asyncio.WindowsSelectorEventLoopPolicy())

from app.db.session import async_session_maker, get_session_factory, get_engine
print("Imported async_session_maker:", type(async_session_maker))
print("Is callable?", callable(async_session_maker))

async def test():
    print("Testing get_session_factory directly...")
    factory = get_session_factory()
    print("Factory:", type(factory))
    
    print("Testing async with async_session_maker()...")
    try:
        async with async_session_maker() as db:
            print("DB acquired:", type(db))
    except Exception as e:
        print("EXCEPTION:", type(e), e)

asyncio.run(test())
