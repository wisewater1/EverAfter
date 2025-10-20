from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.core.config import settings
from app.auth.middleware import JWTAuthMiddleware
from app.api import engrams, chat, tasks, autonomous_tasks, personality
from contextlib import asynccontextmanager
import asyncio


# Background task worker
background_task = None


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    global background_task
    from app.workers.task_worker import start_worker

    # Start background worker
    background_task = asyncio.create_task(start_worker())
    yield
    # Shutdown
    if background_task:
        background_task.cancel()


app = FastAPI(
    title="EverAfter Multi-Layer Personality AI",
    description="API for creating multi-dimensional personality engrams with family invitations and autonomous AI",
    version="3.0.0",
    lifespan=lifespan
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins_list,
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
