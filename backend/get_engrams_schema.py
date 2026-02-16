import psycopg

db_url = "postgresql://postgres:wMJYRNKeBb3PoIIW@db.sncvecvgxwkkxnxbvglv.supabase.co:5432/postgres?sslmode=require"

def main():
    try:
        with psycopg.connect(db_url) as conn:
            with conn.cursor() as cur:
                print("Columns in 'engrams' table:")
                cur.execute("SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'engrams' AND table_schema = 'public'")
                for row in cur.fetchall():
                    print(f"- {row[0]}: {row[1]}")
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    main()
