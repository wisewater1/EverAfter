from app.db.session import Base, get_engine
from app.models.governance import GovernanceProposal, HealthProtocol


GOVERNANCE_RUNTIME_TABLES = [
    GovernanceProposal.__table__,
    HealthProtocol.__table__,
]


async def ensure_governance_tables() -> None:
    engine = get_engine()
    async with engine.begin() as conn:
        await conn.run_sync(lambda sync_conn: Base.metadata.create_all(sync_conn, tables=GOVERNANCE_RUNTIME_TABLES))
