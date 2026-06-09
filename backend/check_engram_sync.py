import asyncio
import sqlalchemy
from app.db.session import get_session_factory

async def main():
    factory = get_session_factory()
    async with factory() as session:
        print("Checking archetypal_ais...")
        try:
            res = await session.execute(sqlalchemy.text("SELECT id, name FROM archetypal_ais WHERE name ILIKE 'St. Raphael'"))
            print("archetypal_ais:", res.fetchall())
        except Exception as e:
            print("archetypal_ais error:", e)

        print("\nChecking engrams...")
        try:
            res = await session.execute(sqlalchemy.text("SELECT id, name FROM engrams WHERE name ILIKE 'St. Raphael'"))
            print("engrams:", res.fetchall())
        except Exception as e:
            print("engrams error:", e)

if __name__ == "__main__":
    asyncio.run(main())
