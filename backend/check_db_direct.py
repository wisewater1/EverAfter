import psycopg
import os

# parse DATABASE_URL from .env
db_url = "postgresql://postgres:wMJYRNKeBb3PoIIW@db.sncvecvgxwkkxnxbvglv.supabase.co:5432/postgres?sslmode=require"

def main():
    print(f"Connecting to {db_url.split('@')[1]}...")
    try:
        with psycopg.connect(db_url) as conn:
            with conn.cursor() as cur:
                print("\nListing all tables in public schema:")
                cur.execute("SELECT table_name FROM information_schema.tables WHERE table_schema = 'public'")
                tables = [r[0] for r in cur.fetchall()]
                print(", ".join(tables))

                if 'archetypal_ais' in tables:
                    print("\nChecking archetypal_ais:")
                    cur.execute("SELECT id, name, user_id FROM archetypal_ais WHERE name ILIKE 'St. Raphael'")
                    print(cur.fetchall())
                else:
                    print("\nTable 'archetypal_ais' NOT FOUND")

                if 'engrams' in tables:
                    print("\nChecking engrams:")
                    cur.execute("SELECT id, name, user_id FROM engrams WHERE name ILIKE 'St. Raphael'")
                    print(cur.fetchall())
                else:
                    print("\nTable 'engrams' NOT FOUND")
                    
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    main()
