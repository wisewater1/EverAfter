
import os
import psycopg2
from dotenv import load_dotenv

# Load root .env
load_dotenv('../.env')

db_url = os.getenv('DATABASE_URL')
if not db_url:
    print("DATABASE_URL not found!")
    exit(1)

# Clean URL for psycopg2
clean_url = db_url.replace('postgresql+asyncpg://', 'postgresql://')

try:
    conn = psycopg2.connect(clean_url)
    cur = conn.cursor()
    
    # 1. Check latest user
    cur.execute("SELECT user_id FROM daily_question_responses ORDER BY created_at DESC LIMIT 1")
    user_id = cur.fetchone()
    print(f"Latest User ID: {user_id[0] if user_id else 'None'}")
    
    # 2. Check Raphael engrams
    cur.execute("SELECT id, name, user_id, is_ai_active FROM engrams WHERE name = 'St. Raphael'")
    rows = cur.fetchall()
    for row in rows:
        print(f"Engram: {row}")
        
    cur.close()
    conn.close()
except Exception as e:
    print(f"Error: {e}")
