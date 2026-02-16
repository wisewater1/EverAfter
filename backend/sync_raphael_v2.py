import psycopg

db_url = "postgresql://postgres:wMJYRNKeBb3PoIIW@db.sncvecvgxwkkxnxbvglv.supabase.co:5432/postgres?sslmode=require"

def main():
    try:
        with psycopg.connect(db_url) as conn:
            with conn.cursor() as cur:
                print("Dumping EVERYTHING in archetypal_ais:")
                cur.execute("SELECT id, name, user_id FROM archetypal_ais")
                rows = cur.fetchall()
                print(f"Total rows found: {len(rows)}")
                
                rid = None
                uid = None
                name_match = None
                
                for row in rows:
                    print(f"- {row[0]} | {repr(row[1])} | {row[2]}")
                    if "Raphael" in row[1]:
                        rid, name_match, uid = row[0], row[1], row[2]
                
                if rid:
                    print(f"\nFound match: {name_match}. Syncing to 'engrams'...")
                    # Get full details
                    cur.execute("SELECT * FROM archetypal_ais WHERE id = %s", (rid,))
                    full_row = cur.fetchone()
                    
                    # Columns in engrams: id, name, description, avatar_url, user_id, relationship, engram_type, email, birthday, created_at, updated_at, personality_summary, ai_readiness_score, is_ai_active, family_member_id
                    # Let's insert the basics
                    cur.execute(
                        "INSERT INTO engrams (id, name, description, avatar_url, user_id, relationship, engram_type, is_ai_active) VALUES (%s, %s, %s, %s, %s, %s, %s, %s) ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name",
                        (rid, name_match, "Heavenly Healer", None, uid, "Healer", "custom", True)
                    )
                    print("Sync complete.")
                else:
                    print("\nNo 'Raphael' found in any name in archetypal_ais.")
                
                conn.commit()

    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    main()
