import asyncio
import sys
import os

# Add backend to path
sys.path.append(os.path.dirname(__file__))

from app.db.session import engine, get_engine, Base
from sqlalchemy import Column, String

class StubUser(Base):
    __tablename__ = 'users'
    __table_args__ = {'extend_existing': True}
    id = Column(String, primary_key=True)

from app.models.family_home import FamilyTask, ShoppingItem, CalendarEvent, BulletinMessage
from app.models.genealogy import FamilyNode, FamilyRelationship

async def init_family_db():
    print("Initializing Family and Genealogy Tables with SQLAlchemy...")
    db_engine = get_engine()
    
    # Clear foreign keys so it generates the missing tables without strict database reference checks
    FamilyTask.__table__.c.user_id.foreign_keys.clear()
    ShoppingItem.__table__.c.user_id.foreign_keys.clear()
    CalendarEvent.__table__.c.user_id.foreign_keys.clear()
    BulletinMessage.__table__.c.user_id.foreign_keys.clear()
    FamilyNode.__table__.c.user_id.foreign_keys.clear()
    
    FamilyRelationship.__table__.c.from_node_id.foreign_keys.clear()
    FamilyRelationship.__table__.c.to_node_id.foreign_keys.clear()

    async with db_engine.begin() as conn:
        print("Running sync to create tables...")
        await conn.run_sync(lambda sync_conn: FamilyTask.__table__.create(sync_conn, checkfirst=True))
        await conn.run_sync(lambda sync_conn: ShoppingItem.__table__.create(sync_conn, checkfirst=True))
        await conn.run_sync(lambda sync_conn: CalendarEvent.__table__.create(sync_conn, checkfirst=True))
        await conn.run_sync(lambda sync_conn: BulletinMessage.__table__.create(sync_conn, checkfirst=True))
        await conn.run_sync(lambda sync_conn: FamilyNode.__table__.create(sync_conn, checkfirst=True))
        await conn.run_sync(lambda sync_conn: FamilyRelationship.__table__.create(sync_conn, checkfirst=True))
    print("Database tables created successfully!")

if __name__ == "__main__":
    if sys.platform == 'win32':
        asyncio.set_event_loop_policy(asyncio.WindowsSelectorEventLoopPolicy())
    asyncio.run(init_family_db())
