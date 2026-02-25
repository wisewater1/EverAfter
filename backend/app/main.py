import sys
import asyncio

if sys.platform == 'win32':
    asyncio.set_event_loop_policy(asyncio.WindowsSelectorEventLoopPolicy())

from fastapi import FastAPI
print("====================================================")
print("EVERAFTER BACKEND STARTING ON PORT 8001 (FIXED)")
print("====================================================")
from fastapi.middleware.cors import CORSMiddleware
from app.core.config import settings
from app.auth.middleware import JWTAuthMiddleware
from app.api import (
    engrams, chat, tasks, autonomous_tasks, personality, health, social, saints, 
    finance, monitoring, akashic, council, time_capsule, rituals, sacred_state,
    integrity, marketplace_assets, causal_twin
)
from contextlib import asynccontextmanager
# ... (imports omit)

# ... (middleware omit)

# Lifespan context manager for startup/shutdown events
@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    print("Startup: Initializing resources...")
    from app.services.saint_runtime import saint_runtime
    asyncio.create_task(saint_runtime.listen_for_events())
    asyncio.create_task(saint_runtime.run_vigils())
    yield
    # Shutdown
    print("Shutdown: Cleaning up resources...")

app = FastAPI(
    title=settings.PROJECT_NAME, 
    openapi_url=f"{settings.API_V1_STR}/openapi.json",
    lifespan=lifespan
)

# Set all CORS enabled origins
if settings.BACKEND_CORS_ORIGINS:
    app.add_middleware(
        CORSMiddleware,
        allow_origins=[str(origin) for origin in settings.BACKEND_CORS_ORIGINS],
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
