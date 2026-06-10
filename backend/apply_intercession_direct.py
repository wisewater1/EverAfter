import psycopg
import os
from dotenv import load_dotenv

load_dotenv()
db_url = os.getenv("DATABASE_URL")
if db_url:
    db_url = db_url.replace("+asyncpg", "").replace("ssl=require", "sslmode=require")

def main():
    if not db_url:
        print("DATABASE_URL not found!")
        return

    print(f"Connecting to {db_url.split('@')[1]}...")
    try:
        with psycopg.connect(db_url) as conn:
            with conn.cursor() as cur:
                print("Creating guardian_intercessions table...")
                cur.execute("""
                CREATE TABLE IF NOT EXISTS public.guardian_intercessions (
                    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                    user_id UUID NOT NULL,
                    saint_id TEXT NOT NULL,
                    description TEXT NOT NULL,
                    tool_name TEXT NOT NULL,
                    tool_kwargs JSONB NOT NULL,
                    status TEXT NOT NULL DEFAULT 'pending',
                    execution_result JSONB,
                    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
                    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
                );
                """)
                cur.execute("CREATE INDEX IF NOT EXISTS idx_intercessions_user_id ON public.guardian_intercessions(user_id);")
                cur.execute("CREATE INDEX IF NOT EXISTS idx_intercessions_status ON public.guardian_intercessions(status);")
                cur.execute("CREATE INDEX IF NOT EXISTS idx_intercessions_saint_id ON public.guardian_intercessions(saint_id);")
                
                print("Table created successfully!")
                conn.commit()
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    main()
