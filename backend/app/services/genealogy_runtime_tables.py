from app.db.session import Base, get_engine
from app.models.genealogy import FamilyEvent, FamilyNode, FamilyRelationship


GENEALOGY_RUNTIME_TABLES = [
    FamilyNode.__table__,
    FamilyRelationship.__table__,
    FamilyEvent.__table__,
]


async def ensure_genealogy_tables() -> None:
    engine = get_engine()
    async with engine.begin() as conn:
        await conn.run_sync(
            lambda sync_conn: Base.metadata.create_all(
                sync_conn,
                tables=GENEALOGY_RUNTIME_TABLES,
            )
        )
