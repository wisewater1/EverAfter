from app.db.session import Base, get_engine
from app.models.quiz_invite import QuizInvite


QUIZ_INVITE_RUNTIME_TABLES = [
    QuizInvite.__table__,
]


async def ensure_quiz_invite_tables() -> None:
    engine = get_engine()
    async with engine.begin() as conn:
        await conn.run_sync(
            lambda sync_conn: Base.metadata.create_all(
                sync_conn,
                tables=QUIZ_INVITE_RUNTIME_TABLES,
            )
        )
