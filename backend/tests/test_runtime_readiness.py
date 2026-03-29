from types import SimpleNamespace
from unittest.mock import AsyncMock

import pytest

from app.services.runtime_readiness import ROUTE_DEFINITIONS, collect_runtime_readiness


@pytest.mark.asyncio
async def test_collect_runtime_readiness_marks_voice_unavailable_when_sidecar_is_missing(monkeypatch):
    app = SimpleNamespace(
        state=SimpleNamespace(
            runtime_status={
                "status": "degraded",
                "db_ready": True,
                "bootstrap_complete": True,
                "last_error": None,
            },
            bootstrap_components={
                "engram": {"ready": True, "error": None},
                "genealogy": {"ready": True, "error": None},
                "family_home": {"ready": True, "error": None},
                "finance": {"ready": True, "error": None},
                "health_prediction": {"ready": True, "error": None},
                "governance": {"ready": True, "error": None},
                "time_capsules": {"ready": True, "error": None},
                "wisegold": {"ready": True, "error": None},
            },
        )
    )

    monkeypatch.setattr("app.services.runtime_readiness.settings.VOICE_AI_BASE_URL", "")
    monkeypatch.setattr("app.services.runtime_readiness.settings.ALLOW_DEV_VOICE_PROVIDER", False)
    monkeypatch.setattr("app.services.runtime_readiness._storage_dir_ready", lambda _path: (True, None))

    readiness = await collect_runtime_readiness(app, include_live_checks=False)
    capability = readiness["capability_map"]["joseph.voice"]

    assert capability["status"] == "unavailable"
    assert "Voice AI sidecar" in capability["reason"]


@pytest.mark.asyncio
async def test_collect_runtime_readiness_marks_governance_unavailable_when_bootstrap_failed():
    app = SimpleNamespace(
        state=SimpleNamespace(
            runtime_status={
                "status": "degraded",
                "db_ready": False,
                "bootstrap_complete": True,
                "last_error": "governance: relation does not exist",
            },
            bootstrap_components={
                "engram": {"ready": True, "error": None},
                "genealogy": {"ready": True, "error": None},
                "family_home": {"ready": True, "error": None},
                "finance": {"ready": True, "error": None},
                "health_prediction": {"ready": True, "error": None},
                "governance": {"ready": False, "error": "relation governance_proposals does not exist"},
                "time_capsules": {"ready": True, "error": None},
                "wisegold": {"ready": True, "error": None},
            },
        )
    )

    readiness = await collect_runtime_readiness(app, include_live_checks=False)
    capability = readiness["capability_map"]["raphael.governance"]

    assert capability["status"] == "unavailable"
    assert "governance_proposals" in capability["reason"]


@pytest.mark.asyncio
async def test_collect_runtime_readiness_registers_all_route_dependencies(monkeypatch):
    app = SimpleNamespace(
        state=SimpleNamespace(
            runtime_status={
                "status": "healthy",
                "db_ready": True,
                "bootstrap_complete": True,
                "last_error": None,
            },
            bootstrap_components={
                "engram": {"ready": True, "error": None},
                "genealogy": {"ready": True, "error": None},
                "family_home": {"ready": True, "error": None},
                "finance": {"ready": True, "error": None},
                "health_prediction": {"ready": True, "error": None},
                "governance": {"ready": True, "error": None},
                "time_capsules": {"ready": True, "error": None},
                "wisegold": {"ready": True, "error": None},
            },
        )
    )

    monkeypatch.setattr("app.services.runtime_readiness.settings.OPENAI_API_KEY", "test-openai-key")
    monkeypatch.setattr("app.services.runtime_readiness.settings.SUPABASE_URL", "https://example.supabase.co")
    monkeypatch.setattr("app.services.runtime_readiness.settings.SUPABASE_ANON_KEY", "anon-key")
    monkeypatch.setattr("app.services.runtime_readiness.settings.TERRA_API_KEY", "terra-key")
    monkeypatch.setattr("app.services.runtime_readiness.settings.TERRA_DEV_ID", "terra-dev")
    monkeypatch.setattr("app.services.runtime_readiness.settings.TERRA_WEBHOOK_SECRET", "terra-secret")
    monkeypatch.setattr("app.services.runtime_readiness.settings.WISEGOLD_ORACLE_API_KEY", "wisegold-key")
    monkeypatch.setattr("app.services.runtime_readiness.settings.PLAID_CLIENT_ID", "plaid-id")
    monkeypatch.setattr("app.services.runtime_readiness.settings.PLAID_SECRET", "plaid-secret")
    monkeypatch.setattr("app.services.runtime_readiness.os.getenv", lambda key, default="": {
        "SMTP_SERVER": "smtp.example.com",
        "SMTP_USERNAME": "user",
        "SMTP_PASSWORD": "pass",
    }.get(key, default))
    monkeypatch.setattr("app.services.runtime_readiness._storage_dir_ready", lambda _path: (True, None))
    monkeypatch.setattr(
        "app.services.runtime_readiness.voice_ai_service.health",
        AsyncMock(return_value={"available": True, "message": "ok"}),
    )

    readiness = await collect_runtime_readiness(app, include_live_checks=True)
    capability_ids = set(readiness["capability_map"].keys())

    for route in ROUTE_DEFINITIONS:
        for dep in route["deps"]:
            assert dep in capability_ids, f"Missing runtime capability for route dependency {dep}"

    assert readiness["capability_map"]["trinity.synapse"]["status"] == "healthy"


@pytest.mark.asyncio
async def test_collect_runtime_readiness_accepts_supabase_session_auth_without_custom_jwt(monkeypatch):
    app = SimpleNamespace(
        state=SimpleNamespace(
            runtime_status={
                "status": "healthy",
                "db_ready": True,
                "bootstrap_complete": True,
                "last_error": None,
            },
            bootstrap_components={
                "engram": {"ready": True, "error": None},
                "genealogy": {"ready": True, "error": None},
                "family_home": {"ready": True, "error": None},
                "finance": {"ready": True, "error": None},
                "health_prediction": {"ready": True, "error": None},
                "governance": {"ready": True, "error": None},
                "time_capsules": {"ready": True, "error": None},
                "wisegold": {"ready": True, "error": None},
            },
        )
    )

    monkeypatch.setattr("app.services.runtime_readiness.settings.ENVIRONMENT", "production")
    monkeypatch.setattr("app.services.runtime_readiness.settings.JWT_SECRET_KEY", "dev-jwt-secret")
    monkeypatch.setattr("app.services.runtime_readiness.settings.SUPABASE_URL", "https://example.supabase.co")
    monkeypatch.setattr("app.services.runtime_readiness.settings.SUPABASE_ANON_KEY", "anon-key")
    monkeypatch.setattr("app.services.runtime_readiness.settings.OPENAI_API_KEY", "test-openai-key")
    monkeypatch.setattr("app.services.runtime_readiness._storage_dir_ready", lambda _path: (True, None))
    monkeypatch.setattr("app.services.runtime_readiness.settings.ALLOW_DEV_AUTH_FALLBACK", False)

    readiness = await collect_runtime_readiness(app, include_live_checks=False)

    assert readiness["capability_map"]["auth.session"]["status"] == "healthy"
