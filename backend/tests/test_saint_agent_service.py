import uuid
from unittest.mock import AsyncMock, MagicMock

import pytest

from app.services.saint_agent_service import SaintAgentService, SaintStorageUnavailableError
from app.services.saint_fallback_store import SaintFallbackStore


TEST_USER_ID = "00000000-0000-4000-8000-000000000001"


@pytest.mark.asyncio
async def test_builtin_saint_chat_returns_degraded_response_without_storage(monkeypatch):
    service = SaintAgentService()
    session = AsyncMock()
    service.llm = MagicMock()
    service.llm.generate_response = AsyncMock(return_value="Degraded guidance is still available.")

    monkeypatch.setattr(
        service,
        "bootstrap_saint_engram",
        AsyncMock(
            return_value={
                "engram_id": str(uuid.uuid4()),
                "saint_id": "gabriel",
                "name": "St. Gabriel",
                "is_new": False,
                "degraded": True,
                "mode": "degraded",
                "persistence_available": False,
            }
        ),
    )

    response = await service.chat(session, TEST_USER_ID, "gabriel", "What can you still do?")

    assert response["degraded"] is True
    assert response["mode"] == "degraded"
    assert response["persistence_available"] is False
    assert response["history_available"] is False
    assert response["knowledge_available"] is False
    assert response["content"] == "Degraded guidance is still available."
    service.llm.generate_response.assert_awaited_once()
    session.execute.assert_not_called()


@pytest.mark.asyncio
async def test_dynamic_saint_chat_raises_explicit_storage_error():
    service = SaintAgentService()
    session = AsyncMock()

    service.llm = MagicMock()
    service.llm.generate_response = AsyncMock()

    bootstrap_id = str(uuid.uuid4())
    session.execute.side_effect = OSError("[Errno 101] Network is unreachable")

    async def bootstrap_dynamic(*_args, **_kwargs):
        return {
            "engram_id": bootstrap_id,
            "saint_id": "member-123",
            "name": "Custom Member",
            "is_new": False,
            "degraded": False,
            "mode": "full",
            "persistence_available": True,
        }

    service.bootstrap_saint_engram = AsyncMock(side_effect=bootstrap_dynamic)

    with pytest.raises(SaintStorageUnavailableError) as excinfo:
        await service.chat(session, TEST_USER_ID, "member-123", "Are you there?")

    assert "Persistent saint storage is unavailable" in str(excinfo.value)
    service.llm.generate_response.assert_not_called()


@pytest.mark.asyncio
async def test_builtin_saint_chat_persists_to_local_fallback_store(monkeypatch, tmp_path):
    service = SaintAgentService()
    session = AsyncMock()
    session.execute.side_effect = OSError("[Errno 101] Network is unreachable")
    service.llm = MagicMock()
    service.llm.generate_response = AsyncMock(
        side_effect=[
            "Persistent degraded guidance is still available.",
            '[{"key": "budget_priority", "value": "groceries first", "category": "goals"}]',
        ]
    )

    fallback_store = SaintFallbackStore(str(tmp_path))
    monkeypatch.setattr("app.services.saint_agent_service.saint_fallback_store", fallback_store)
    monkeypatch.setattr(service, "_build_saint_prompt", AsyncMock(return_value="Saint prompt"))
    monkeypatch.setattr(
        service,
        "bootstrap_saint_engram",
        AsyncMock(
            return_value={
                "engram_id": str(uuid.uuid4()),
                "saint_id": "gabriel",
                "name": "St. Gabriel",
                "is_new": False,
                "degraded": True,
                "mode": "degraded",
                "persistence_available": True,
            }
        ),
    )

    response = await service.chat(session, TEST_USER_ID, "gabriel", "Please remember groceries come first.")

    assert response["degraded"] is True
    assert response["persistence_available"] is True
    assert response["history_available"] is True
    assert response["knowledge_available"] is True
    assert response["content"] == "Persistent degraded guidance is still available."

    history = await service.get_chat_history(session, TEST_USER_ID, "gabriel")
    assert [message["role"] for message in history] == ["user", "assistant"]
    assert history[0]["content"] == "Please remember groceries come first."

    knowledge = await service.get_knowledge(session, TEST_USER_ID, "gabriel")
    assert knowledge[0]["key"] == "budget_priority"
    assert knowledge[0]["value"] == "groceries first"


@pytest.mark.asyncio
async def test_saint_statuses_degrade_when_storage_is_unreachable():
    service = SaintAgentService()
    session = AsyncMock()
    session.execute.side_effect = OSError("[Errno 101] Network is unreachable")

    statuses = await service.get_all_saint_statuses(session, TEST_USER_ID)

    assert statuses
    assert all(status["built_in_available"] is True for status in statuses)
    assert all(status["availability_mode"] == "degraded" for status in statuses)
    assert all(status["persistence_available"] is True for status in statuses)
    assert all(status["history_available"] is True for status in statuses)
    assert all(status["knowledge_available"] is True for status in statuses)
