import sys
import asyncio
if sys.platform == 'win32':
    asyncio.set_event_loop_policy(asyncio.WindowsSelectorEventLoopPolicy())

from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker
from sqlalchemy.orm import declarative_base
from app.core.config import settings

engine = None
AsyncSessionLocal = None

from sqlalchemy import event
from supabase import create_client, Client

def create_supabase_client() -> Client:
    from app.core.config import settings
    return create_client(settings.SUPABASE_URL, settings.SUPABASE_SERVICE_ROLE_KEY)

def get_engine():
    global engine, AsyncSessionLocal
    if engine is None:
        database_url = settings.database_url_normalized
        connect_args = {}
        if database_url.startswith("postgresql+asyncpg://"):
            connect_args = {
                "timeout": settings.DB_CONNECT_TIMEOUT_SECONDS,
                "command_timeout": settings.DB_COMMAND_TIMEOUT_SECONDS,
                "server_settings": {"application_name": "everafter-api"},
            }

        engine = create_async_engine(
            database_url,
            echo=settings.ENVIRONMENT == "development",
            future=True,
            pool_pre_ping=True,
            pool_size=20,
            max_overflow=10,
            pool_timeout=settings.DB_POOL_TIMEOUT_SECONDS,
            connect_args=connect_args,
        )
        
        if "sqlite" in database_url:
            @event.listens_for(engine.sync_engine, "connect")
            def set_sqlite_pragma(dbapi_connection, connection_record):
                cursor = dbapi_connection.cursor()
                cursor.execute("PRAGMA journal_mode=WAL")
                cursor.execute("PRAGMA synchronous=NORMAL")
                cursor.close()

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
    if factory is None:
        raise RuntimeError("Database session factory is not initialized")
    async with factory() as session:
        try:
            yield session
        finally:
            await session.close()

# Aliases for backward compatibility
get_session = get_async_session

def async_session_maker() -> async_sessionmaker:
    return get_session_factory()()
