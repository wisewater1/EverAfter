from sqlalchemy import text, create_engine
import asyncio
import sys
import os

# Database URL from .env
DATABASE_URL = "postgresql://postgres.sncvecvgxwkkxnxbvglv:wMJYRNKeBb3PoIIW@aws-0-us-east-1.pooler.supabase.com:6543/postgres"

def find_user():
    print("Searching for user_id in profiles table...", flush=True)
    try:
        engine = create_engine(DATABASE_URL.replace("+asyncpg", ""))
        with engine.connect() as conn:
            result = conn.execute(text("SELECT id FROM profiles LIMIT 5"))
            rows = result.fetchall()
            if rows:
                print("USERS_FOUND:")
                for row in rows:
                    print(f"- ID: {row[0]}", flush=True)
            else:
                print("NO USERS FOUND IN PROFILES TABLE", flush=True)
                # Try generic user search in common tables
                for table in ['archetypal_ais', 'daily_question_responses', 'user_daily_progress']:
                    try:
                        res = conn.execute(text(f"SELECT user_id FROM {table} LIMIT 1"))
                        row = res.fetchone()
                        if row:
                            print(f"FOUND in {table}: {row[0]}", flush=True)
                            return
                    except Exception: pass
    except Exception as e:
        print(f"Database error: {e}", flush=True)

if __name__ == "__main__":
    find_user()
