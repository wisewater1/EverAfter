import asyncio
import os
import sys
import uuid
import httpx
from sqlalchemy import text
from app.db.session import get_session_factory

sys.path.append(os.getcwd())

async def ultra_debug():
    # 1. TEST OLLAMA
    print("!!! TESTING OLLAMA !!!", flush=True)
    try:
         async with httpx.AsyncClient() as client:
            resp = await client.get("http://localhost:11434/api/tags")
            print(f"!!! OLLAMA TAGS: {resp.text} !!!", flush=True)
            
            # Try a simple chat to be sure
            chat_resp = await client.post(
                "http://localhost:11434/api/chat",
                json={
                    "model": "mistral",
                    "messages": [{"role": "user", "content": "hi"}],
                    "stream": False
                },
                timeout=10.0
            )
            print(f"!!! OLLAMA CHAT TEST: {chat_resp.status_code} - {chat_resp.text[:100]} !!!", flush=True)
    except Exception as e:
        print(f"!!! OLLAMA FAILURE: {e} !!!", flush=True)

    # 2. DB ANALYSIS
    print("!!! DB ANALYSIS !!!", flush=True)
    AsyncSessionLocal = get_session_factory()
    async with AsyncSessionLocal() as session:
        try:
            # Check FK
            fk_sql = """
                SELECT ccu.table_name, ccu.column_name 
                FROM information_schema.constraint_column_usage AS ccu 
                JOIN information_schema.key_column_usage AS kcu ON ccu.constraint_name = kcu.constraint_name 
                WHERE kcu.table_name = 'archetypal_ais' AND kcu.column_name = 'user_id'
            """
            res = await session.execute(text(fk_sql))
            row = res.fetchone()
            if row: print(f"!!! FK TARGET: {row[0]}({row[1]}) !!!", flush=True)
            
            # Check data in PROFILES
            try:
                prof_res = await session.execute(text("SELECT id FROM profiles LIMIT 1"))
                p_id = prof_res.scalar()
                if p_id: print(f"!!! FOUND PROFILE_ID: {p_id} !!!", flush=True)
            except: pass
            
            # Check auth.users
            auth_res = await session.execute(text("SELECT id FROM auth.users LIMIT 1"))
            a_id = auth_res.scalar()
            if a_id: print(f"!!! FOUND AUTH_ID: {a_id} !!!", flush=True)
            
        except Exception as e:
            print(f"!!! DB DEBUG ERROR: {e} !!!", flush=True)

if __name__ == "__main__":
    if sys.platform == 'win32':
        asyncio.set_event_loop_policy(asyncio.WindowsSelectorEventLoopPolicy())
    asyncio.run(ultra_debug())
