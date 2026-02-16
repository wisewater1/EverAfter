import asyncio
import psycopg

async def test_connection():
    # Direct connection string (inferred from project ref)
    # Host: db.<project_ref>.supabase.co
    # User: postgres
    # Pass: wMJYRNKeBb3PoIIW
    # DB: postgres
    conn_str_direct = "postgresql://postgres:wMJYRNKeBb3PoIIW@db.sncvecvgxwkkxnxbvglv.supabase.co:5432/postgres"
    
    # Pooler connection string (from .env)
    conn_str_pooler = "postgresql://postgres.sncvecvgxwkkxnxbvglv:wMJYRNKeBb3PoIIW@aws-0-us-east-1.pooler.supabase.com:6543/postgres"

    print("Testing DIRECT connection...")
    try:
        async with await psycopg.AsyncConnection.connect(conn_str_direct) as aconn:
            async with aconn.cursor() as cur:
                await cur.execute("SELECT version()")
                print(await cur.fetchone())
        print("DIRECT connection SUCCESS!")
    except Exception as e:
        print(f"DIRECT connection FAILED: {e}")

    print("\nTesting POOLER connection...")
    try:
        async with await psycopg.AsyncConnection.connect(conn_str_pooler) as aconn:
            async with aconn.cursor() as cur:
                await cur.execute("SELECT version()")
                print(await cur.fetchone())
        print("POOLER connection SUCCESS!")
    except Exception as e:
        print(f"POOLER connection FAILED: {e}")

if __name__ == "__main__":
    asyncio.run(test_connection())
