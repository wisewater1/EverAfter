import asyncio
import psycopg

async def test_connection():
    # Direct connection string
    conn_str_direct = "postgresql://postgres:wMJYRNKeBb3PoIIW@db.sncvecvgxwkkxnxbvglv.supabase.co:5432/postgres?sslmode=require"

    print("Testing DIRECT connection...")
    try:
        async with await psycopg.AsyncConnection.connect(conn_str_direct) as aconn:
            async with aconn.cursor() as cur:
                await cur.execute("SELECT version()")
                print(await cur.fetchone())
        print("DIRECT connection SUCCESS!")
    except Exception as e:
        print(f"DIRECT connection FAILED: {e}")
        with open("direct_error.txt", "w") as f:
            f.write(str(e))

if __name__ == "__main__":
    import sys
    if sys.platform == 'win32':
        asyncio.set_event_loop_policy(asyncio.WindowsSelectorEventLoopPolicy())
    asyncio.run(test_connection())
