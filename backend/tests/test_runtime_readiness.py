from types import SimpleNamespace

import pytest

from app.services.runtime_readiness import collect_runtime_readiness


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
                "wisegold": {"ready": True, "error": None},
            },
        )
    )

    readiness = await collect_runtime_readiness(app, include_live_checks=False)
    capability = readiness["capability_map"]["raphael.governance"]

    assert capability["status"] == "unavailable"
    assert "governance_proposals" in capability["reason"]
