from app.db.session import Base, get_engine
from app.models.finance import BankAccount, BankConnection, BankImportedTransaction


FINANCE_RUNTIME_TABLES = [
    BankConnection.__table__,
    BankAccount.__table__,
    BankImportedTransaction.__table__,
]


async def ensure_finance_runtime_tables() -> None:
    engine = get_engine()
    async with engine.begin() as conn:
        await conn.run_sync(lambda sync_conn: Base.metadata.create_all(sync_conn, tables=FINANCE_RUNTIME_TABLES))
