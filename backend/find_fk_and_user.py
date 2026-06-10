from sqlalchemy import text
from app.db.session import get_session_factory
import asyncio
import sys
import os

sys.path.append(os.getcwd())

async def find_everything():
    AsyncSessionLocal = get_session_factory()
    async with AsyncSessionLocal() as session:
        print("--- FK SEARCH ---", flush=True)
        # Find where archetypal_ais.user_id points
        sql = """
            SELECT
                ccu.table_schema AS to_schema,
                ccu.table_name AS to_table,
                ccu.column_name AS to_column
            FROM
                information_schema.table_constraints AS tc
                JOIN information_schema.key_column_usage AS kcu
                  ON tc.constraint_name = kcu.constraint_name
                JOIN information_schema.constraint_column_usage AS ccu
                  ON ccu.constraint_name = tc.constraint_name
            WHERE tc.constraint_type = 'FOREIGN KEY' AND tc.table_name='archetypal_ais' AND kcu.column_name='user_id';
        """
        res = await session.execute(text(sql))
        row = res.fetchone()
        if row:
            target_schema, target_table, target_col = row
            print(f"FK_TARGET: {target_schema}.{target_table}({target_col})", flush=True)
            
            # Now find a valid ID in THAT table
            try:
                print(f"Looking for data in {target_schema}.{target_table}...", flush=True)
                id_res = await session.execute(text(f"SELECT {target_col} FROM {target_schema}.{target_table} LIMIT 1"))
                valid_id = id_res.scalar()
                if valid_id:
                    print(f"FOUND_VALID_ID: {valid_id}", flush=True)
                else:
                    print(f"TABLE {target_schema}.{target_table} IS EMPTY!", flush=True)
            except Exception as e:
                print(f"Error querying target table: {e}", flush=True)
        else:
            print("NO_FK_FOUND", flush=True)

if __name__ == "__main__":
    if sys.platform == 'win32':
        asyncio.set_event_loop_policy(asyncio.WindowsSelectorEventLoopPolicy())
    asyncio.run(find_everything())
