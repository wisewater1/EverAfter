from app.db.session import Base, get_engine
from app.models.health_prediction_runtime import DelphiTrajectory, HealthPredictionScenario


HEALTH_PREDICTION_RUNTIME_TABLES = [
    HealthPredictionScenario.__table__,
    DelphiTrajectory.__table__,
]


async def ensure_health_prediction_runtime_tables() -> None:
    engine = get_engine()
    async with engine.begin() as conn:
        await conn.run_sync(
            lambda sync_conn: Base.metadata.create_all(
                sync_conn,
                tables=HEALTH_PREDICTION_RUNTIME_TABLES,
            )
        )
