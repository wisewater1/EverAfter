from app.db.session import Base, get_engine
from app.models.time_capsule import TimeCapsule


TIME_CAPSULE_RUNTIME_TABLES = [
    TimeCapsule.__table__,
]


async def ensure_time_capsule_tables() -> None:
    engine = get_engine()
    async with engine.begin() as conn:
        await conn.run_sync(lambda sync_conn: Base.metadata.create_all(sync_conn, tables=TIME_CAPSULE_RUNTIME_TABLES))
