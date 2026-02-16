import asyncio
import os
import sys
import uuid
import httpx
from sqlalchemy import text
from app.db.session import get_session_factory

sys.path.append(os.getcwd())

async def ultra_debug():
    results = []
    
    # 1. TEST OLLAMA
    results.append("!!! TESTING OLLAMA !!!")
    try:
         async with httpx.AsyncClient() as client:
            resp = await client.get("http://localhost:11434/api/tags")
            results.append(f"!!! OLLAMA TAGS: {resp.text} !!!")
            
            chat_resp = await client.post(
                "http://localhost:11434/api/chat",
                json={
                    "model": "mistral",
                    "messages": [{"role": "user", "content": "hi"}],
                    "stream": False
                },
                timeout=10.0
            )
            results.append(f"!!! OLLAMA CHAT TEST: {chat_resp.status_code} - {chat_resp.text[:100]} !!!")
    except Exception as e:
        results.append(f"!!! OLLAMA FAILURE: {e} !!!")

    # 2. DB ANALYSIS
    results.append("!!! DB ANALYSIS !!!")
    AsyncSessionLocal = get_session_factory()
    async with AsyncSessionLocal() as session:
        try:
            # Check FK target for archetypal_ais
            fk_sql = """
                SELECT
                    ccu.table_schema as to_schema,
                    ccu.table_name as to_table,
                    ccu.column_name as to_column
                FROM
                    information_schema.table_constraints AS tc
                    JOIN information_schema.key_column_usage AS kcu
                      ON tc.constraint_name = kcu.constraint_name
                    JOIN information_schema.constraint_column_usage AS ccu
                      ON ccu.constraint_name = tc.constraint_name
                WHERE tc.constraint_type = 'FOREIGN KEY' AND tc.table_name='archetypal_ais' AND kcu.column_name='user_id';
            """
            res = await session.execute(text(fk_sql))
            row = res.fetchone()
            if row:
                results.append(f"!!! FK TARGET: {row[0]}.{row[1]}({row[2]}) !!!")
                # Check data in THAT table
                try:
                    target_res = await session.execute(text(f"SELECT {row[2]} FROM {row[0]}.{row[1]} LIMIT 5"))
                    ids = [str(r[0]) for r in target_res.fetchall()]
                    results.append(f"!!! IDS IN {row[0]}.{row[1]}: {ids} !!!")
                except Exception as e:
                    results.append(f"!!! Error querying target table: {e} !!!")
            else:
                results.append("!!! NO FK FOUND FOR archetypal_ais.user_id !!!")
            
            # Check auth.users too
            try:
                auth_res = await session.execute(text("SELECT id FROM auth.users LIMIT 1"))
                a_id = auth_res.scalar()
                results.append(f"!!! FIRST ID IN auth.users: {a_id} !!!")
            except Exception as e:
                results.append(f"!!! Auth query error: {e} !!!")
                
        except Exception as e:
            results.append(f"!!! DB DEBUG ERROR: {e} !!!")

    # Write to file
    with open("debug_output.txt", "w", encoding="utf-8") as f:
        f.write("\n".join(results))
    print("DONE: Wrote results to debug_output.txt")

if __name__ == "__main__":
    if sys.platform == 'win32':
        asyncio.set_event_loop_policy(asyncio.WindowsSelectorEventLoopPolicy())
    asyncio.run(ultra_debug())
