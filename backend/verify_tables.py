import psycopg

db_url = "postgresql://postgres:wMJYRNKeBb3PoIIW@db.sncvecvgxwkkxnxbvglv.supabase.co:5432/postgres?sslmode=require"

def main():
    try:
        with psycopg.connect(db_url) as conn:
            with conn.cursor() as cur:
                print("Tables in public schema:")
                cur.execute("SELECT table_name, table_type FROM information_schema.tables WHERE table_schema = 'public' AND table_name IN ('archetypal_ais', 'engrams')")
                for row in cur.fetchall():
                    print(f"- {row[0]} ({row[1]})")
                
                print("\nCounting rows in archetypal_ais:")
                cur.execute("SELECT count(*) FROM archetypal_ais")
                print(f"Count: {cur.fetchone()[0]}")
                
                print("\nSearching St. Raphael in archetypal_ais:")
                cur.execute("SELECT id, name FROM archetypal_ais WHERE name ILIKE '%Raphael%'")
                print(cur.fetchall())

                print("\nAttempting to count rows in engrams:")
                try:
                    cur.execute("SELECT count(*) FROM engrams")
                    print(f"Count: {cur.fetchone()[0]}")
                except Exception as e:
                    print(f"Error checking engrams: {e}")
                    
    except Exception as e:
        print(f"Main Error: {e}")

if __name__ == "__main__":
    main()
