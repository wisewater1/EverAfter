import pytest
import asyncio
from unittest.mock import MagicMock, AsyncMock

# Setup a default event loop for async tests
@pytest.fixture(scope="session")
def event_loop():
    loop = asyncio.get_event_loop_policy().new_event_loop()
    yield loop
    loop.close()

@pytest.fixture(autouse=True)
def mock_db_session(monkeypatch):
    """Globally mock the database session factory and engine to prevent real connections."""
    mock_session = AsyncMock()
    mock_factory = MagicMock()
    mock_factory.return_value.__aenter__.return_value = mock_session
    
    # Patch create_async_engine to return a mock engine
    mock_engine = MagicMock()
    monkeypatch.setattr("sqlalchemy.ext.asyncio.create_async_engine", lambda *a, **k: mock_engine)
    
    # Patch get_session_factory in the common location
    monkeypatch.setattr("app.db.session.get_session_factory", lambda: mock_factory)
    return mock_session
