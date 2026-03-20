from app.db.session import Base, get_engine
from app.models.engram import (
    ExternalResponse,
    FamilyMemberInvitation,
    VoiceProfile,
    VoiceSample,
    VoiceSynthSession,
    VoiceTrainingRun,
)


ENGRAM_RUNTIME_TABLES = [
    FamilyMemberInvitation.__table__,
    ExternalResponse.__table__,
    VoiceProfile.__table__,
    VoiceSample.__table__,
    VoiceTrainingRun.__table__,
    VoiceSynthSession.__table__,
]


async def ensure_engram_runtime_tables() -> None:
    engine = get_engine()
    async with engine.begin() as conn:
        await conn.run_sync(lambda sync_conn: Base.metadata.create_all(sync_conn, tables=ENGRAM_RUNTIME_TABLES))
