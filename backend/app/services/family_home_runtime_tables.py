from sqlalchemy import inspect, text

from app.db.session import Base, get_engine
from app.models.family_home import BulletinMessage, CalendarEvent, FamilyTask, ShoppingItem


FAMILY_HOME_RUNTIME_TABLES = [
    FamilyTask.__table__,
    ShoppingItem.__table__,
    CalendarEvent.__table__,
    BulletinMessage.__table__,
]

TASK_COLUMNS = {
    "description": "TEXT",
    "task_type": "VARCHAR(32) DEFAULT 'standard' NOT NULL",
    "status": "VARCHAR(32) DEFAULT 'pending' NOT NULL",
    "reward_wg": "INTEGER",
    "ai_brief": "TEXT",
    "metadata_json": "JSON",
}

SHOPPING_COLUMNS = {
    "item_type": "VARCHAR(32) DEFAULT 'standard' NOT NULL",
    "status": "VARCHAR(32) DEFAULT 'needed' NOT NULL",
    "price_est": "INTEGER",
    "trigger_source": "VARCHAR(64)",
    "legacy_beneficiary": "VARCHAR(255)",
    "unlock_year": "INTEGER",
    "metadata_json": "JSON",
}


def _ensure_columns(sync_conn, table_name: str, columns: dict[str, str]) -> None:
    inspector = inspect(sync_conn)
    existing_columns = {column["name"] for column in inspector.get_columns(table_name)}

    for column_name, column_sql in columns.items():
        if column_name in existing_columns:
            continue
        sync_conn.execute(text(f"ALTER TABLE {table_name} ADD COLUMN {column_name} {column_sql}"))


async def ensure_family_home_tables() -> None:
    engine = get_engine()
    async with engine.begin() as conn:
        await conn.run_sync(lambda sync_conn: Base.metadata.create_all(sync_conn, tables=FAMILY_HOME_RUNTIME_TABLES))
        await conn.run_sync(lambda sync_conn: _ensure_columns(sync_conn, "family_tasks", TASK_COLUMNS))
        await conn.run_sync(lambda sync_conn: _ensure_columns(sync_conn, "shopping_items", SHOPPING_COLUMNS))
