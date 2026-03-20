import sys
import asyncio

if sys.platform == 'win32':
    asyncio.set_event_loop_policy(asyncio.WindowsSelectorEventLoopPolicy())

from fastapi import FastAPI
print("====================================================")
print("EVERAFTER BACKEND STARTING ON PORT 8010 (FIXED)")
print("====================================================")
from fastapi.middleware.cors import CORSMiddleware
from app.core.config import settings
from app.auth.middleware import JWTAuthMiddleware
from app.api import (
    engrams, chat, tasks, autonomous_tasks, personality, health, social, saints, 
    finance, monitoring, akashic, council, time_capsule, rituals, sacred_state,
    integrity, marketplace_assets, causal_twin, governance
)
from contextlib import asynccontextmanager


@asynccontextmanager
async def lifespan(app: FastAPI):
    print("Startup: Initializing resources...")
    from app.services.saint_runtime import saint_runtime
    from app.services.compliance_service import compliance_autopilot
    from app.services.engram_runtime_tables import ensure_engram_runtime_tables
    from app.services.finance_runtime_tables import ensure_finance_runtime_tables
    from app.services.health_prediction_runtime_tables import ensure_health_prediction_runtime_tables
    from app.services.wisegold_scheduler import ensure_wisegold_tables, wisegold_scheduler

    background_tasks = []
    await ensure_engram_runtime_tables()
    await ensure_finance_runtime_tables()
    await ensure_health_prediction_runtime_tables()
    await ensure_wisegold_tables()
    if settings.ENABLE_SAINT_EVENT_LISTENER:
        background_tasks.append(asyncio.create_task(saint_runtime.listen_for_events(), name="saint-event-listener"))
    if settings.ENABLE_SAINT_BACKGROUND_VIGILS:
        background_tasks.append(asyncio.create_task(saint_runtime.run_vigils(), name="saint-vigils"))
    if settings.ENABLE_COMPLIANCE_AUTOPILOT:
        background_tasks.append(asyncio.create_task(compliance_autopilot.run_continuous_audits(), name="compliance-autopilot"))
    if settings.ENABLE_WISEGOLD_TICKER:
        background_tasks.append(asyncio.create_task(wisegold_scheduler.run_forever(), name="wisegold-scheduler"))

    app.state.background_tasks = background_tasks
    yield

    print("Shutdown: Cleaning up resources...")
    for task in getattr(app.state, "background_tasks", []):
        task.cancel()
    if getattr(app.state, "background_tasks", None):
        await asyncio.gather(*app.state.background_tasks, return_exceptions=True)


app = FastAPI(
    title=settings.PROJECT_NAME,
    openapi_url=f"{settings.API_V1_STR}/openapi.json",
    lifespan=lifespan
)

if settings.BACKEND_CORS_ORIGINS:
    app.add_middleware(
        CORSMiddleware,
        allow_origins=[str(origin) for origin in settings.BACKEND_CORS_ORIGINS],
        allow_origin_regex=settings.CORS_ORIGIN_REGEX or None,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

app.add_middleware(JWTAuthMiddleware)

app.include_router(engrams.router)
app.include_router(chat.router)
app.include_router(tasks.router)
app.include_router(autonomous_tasks.router)
app.include_router(personality.router)
app.include_router(health.router)
app.include_router(social.router)
app.include_router(saints.router)
app.include_router(finance.router)
app.include_router(monitoring.router)
app.include_router(akashic.router)
app.include_router(council.router)
app.include_router(time_capsule.router)
app.include_router(rituals.router)
app.include_router(sacred_state.router)
from app.api import integration
app.include_router(integration.router, prefix="/integration", tags=["integration"])
app.include_router(integrity.router, prefix="/api/v1/integrity", tags=["integrity"])
app.include_router(marketplace_assets.router, prefix="/api/v1/marketplace", tags=["marketplace"])
app.include_router(causal_twin.router)
app.include_router(governance.router)
from app.api import health_predictions
app.include_router(health_predictions.router)
from app.api import media_uploads
app.include_router(media_uploads.router)
from app.api import personality_quiz
app.include_router(personality_quiz.router)
from app.api import joseph_voice
app.include_router(joseph_voice.router)
from app.api import family_home
app.include_router(family_home.router)
from app.api import genealogy
app.include_router(genealogy.router)
from app.api import trinity_api
app.include_router(trinity_api.router)
from app.api import dht_api
app.include_router(dht_api.router)
from app.api import invitations
app.include_router(invitations.router)

from app.api.endpoints import audit
app.include_router(audit.router, prefix="/api/v1/audit", tags=["audit"])


@app.get("/health")
async def health_check():
    return {
        "status": "healthy",
        "service": "EverAfter Autonomous AI API",
        "version": "1.0.0"
    }


@app.get("/")
async def root():
    return {
        "message": "Welcome to EverAfter Autonomous AI API",
        "docs": "/docs",
        "health": "/health"
    }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "app.main:app",
        host=settings.HOST,
        port=settings.PORT,
        reload=settings.ENVIRONMENT == "development"
    )
