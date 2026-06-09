import asyncio
import sys
import os

# Add backend to path
sys.path.append(os.path.dirname(__file__))

# Import models so Base knows about them
from app.models.audit import ComplianceControl, RestoreDrill, AuditLog
from app.db.session import engine, Base, get_engine
from sqlalchemy import Table, Column, String

async def init_db():
    print("Initializing Database with SQLAlchemy...")
    db_engine = get_engine()
    
    # Clear foreign keys so it generates the missing tables without strict database reference checks
    AuditLog.__table__.c.userId.foreign_keys.clear()

    async with db_engine.begin() as conn:
        print("Running sync to create tables...")
        await conn.run_sync(lambda sync_conn: ComplianceControl.__table__.create(sync_conn, checkfirst=True))
        await conn.run_sync(lambda sync_conn: AuditLog.__table__.create(sync_conn, checkfirst=True))
        await conn.run_sync(lambda sync_conn: RestoreDrill.__table__.create(sync_conn, checkfirst=True))
    print("Database tables created successfully!")

if __name__ == "__main__":
    if sys.platform == 'win32':
        asyncio.set_event_loop_policy(asyncio.WindowsSelectorEventLoopPolicy())
    asyncio.run(init_db())
