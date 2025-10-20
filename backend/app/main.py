from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.core.config import settings
from app.auth.middleware import JWTAuthMiddleware
from app.api import engrams, chat, tasks

app = FastAPI(
    title="EverAfter Autonomous AI API",
    description="API for creating and managing Custom Engrams and Family Member Engrams with Autonomous AI",
    version="1.0.0"
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
