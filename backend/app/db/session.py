import sys
import asyncio
if sys.platform == 'win32':
    asyncio.set_event_loop_policy(asyncio.WindowsSelectorEventLoopPolicy())

from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker
from sqlalchemy.orm import declarative_base
from app.core.config import settings

engine = None
AsyncSessionLocal = None

def get_engine():
    global engine, AsyncSessionLocal
    if engine is None:
        engine = create_async_engine(
            settings.DATABASE_URL,
            echo=settings.ENVIRONMENT == "development",
            future=True,
            pool_pre_ping=True,
            pool_size=5,
            max_overflow=0,
        )
        AsyncSessionLocal = async_sessionmaker(
            engine,
            class_=AsyncSession,
            expire_on_commit=False,
            autocommit=False,
            autoflush=False,
        )
    return engine

def get_session_factory():
    if AsyncSessionLocal is None:
        get_engine()
    return AsyncSessionLocal

Base = declarative_base()


async def get_async_session():
    factory = get_session_factory()
    async with factory() as session:
        try:
            yield session
        finally:
            await session.close()
