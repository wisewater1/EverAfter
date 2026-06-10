from app.db.session import Base, get_engine
from app.models.elohim import ElohimAnchor


ELOHIM_RUNTIME_TABLES = [
    ElohimAnchor.__table__,
]


async def ensure_elohim_tables() -> None:
    engine = get_engine()
    async with engine.begin() as conn:
        await conn.run_sync(
            lambda sync_conn: Base.metadata.create_all(
                sync_conn,
                tables=ELOHIM_RUNTIME_TABLES,
            )
        )
