import psycopg

db_url = "postgresql://postgres:wMJYRNKeBb3PoIIW@db.sncvecvgxwkkxnxbvglv.supabase.co:5432/postgres?sslmode=require"

def main():
    try:
        with psycopg.connect(db_url) as conn:
            with conn.cursor() as cur:
                print("Searching for any engram with 'Raphael' in the name in archetypal_ais...")
                cur.execute("SELECT id, user_id, name, description, avatar_url FROM archetypal_ais WHERE name ILIKE '%Raphael%'")
                raphaels = cur.fetchall()
                print(f"Found {len(raphaels)} matching engrams in archetypal_ais.")
                
                for r in raphaels:
                    rid, uid, name, desc, avatar = r
                    print(f"Checking {name} (ID: {rid}) in engrams table...")
                    cur.execute("SELECT id FROM engrams WHERE id = %s", (rid,))
                    if cur.fetchone():
                        print(f"- {name} already exists in engrams.")
                    else:
                        print(f"- {name} missing from engrams. Syncing...")
                        cur.execute(
                            "INSERT INTO engrams (id, user_id, name, description, avatar_url, relationship, engram_type) VALUES (%s, %s, %s, %s, %s, %s, %s)",
                            (rid, uid, name, desc or "Heavenly Healer", avatar, "Healer", "custom")
                        )
                        print(f"- {name} synced successfully.")
                
                conn.commit()
                print("\nSync process completed.")

    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    main()
