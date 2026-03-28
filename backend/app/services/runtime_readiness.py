from __future__ import annotations

import os
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Dict, Iterable, List

from fastapi import FastAPI

from app.core.config import settings
from app.services.voice_ai_service import voice_ai_service


CapabilityRecord = Dict[str, Any]


def _checked_at() -> str:
    return datetime.now(timezone.utc).isoformat()


def _bootstrap_components(app: FastAPI) -> Dict[str, Dict[str, Any]]:
    return getattr(app.state, "bootstrap_components", {})


def _runtime_status(app: FastAPI) -> Dict[str, Any]:
    return getattr(
        app.state,
        "runtime_status",
        {
            "status": "starting",
            "db_ready": False,
            "bootstrap_complete": False,
            "last_error": None,
        },
    )


def _bootstrap_component_ready(app: FastAPI, name: str) -> tuple[bool, str | None]:
    components = _bootstrap_components(app)
    if not components:
        runtime_status = _runtime_status(app)
        if runtime_status.get("bootstrap_complete"):
            return False, "Runtime bootstrap has not published component readiness."
        return False, "Runtime bootstrap is still starting."

    component = components.get(name)
    if not component:
        return False, f"Bootstrap component '{name}' is not registered."
    if component.get("ready"):
        return True, None
    return False, str(component.get("error") or f"Bootstrap component '{name}' is unavailable.")


def _is_default_jwt_secret() -> bool:
    return settings.JWT_SECRET_KEY.strip() in {"", "dev-jwt-secret", "your_secret_key_here_change_in_production", "your_secret_key_here"}


def _storage_dir_ready(path_value: str) -> tuple[bool, str | None]:
    try:
        target = Path(path_value)
        target.mkdir(parents=True, exist_ok=True)
        probe = target / ".readiness-write-test"
        probe.write_text("ok", encoding="utf-8")
        probe.unlink(missing_ok=True)
        return True, None
    except Exception as exc:
        return False, f"Storage path is not writable: {exc}"


def _smtp_ready() -> tuple[bool, str | None]:
    username = os.getenv("SMTP_USERNAME", "").strip()
    password = os.getenv("SMTP_PASSWORD", "").strip()
    server = os.getenv("SMTP_SERVER", "").strip()
    if username and password and server:
        return True, None
    return False, "SMTP is not configured."


def _terra_ready() -> tuple[bool, str | None]:
    if settings.TERRA_API_KEY.strip() and settings.TERRA_DEV_ID.strip() and settings.TERRA_WEBHOOK_SECRET.strip():
        return True, None
    return False, "Terra connector credentials are not configured."


def _build_capability(
    capability_id: str,
    deps: Iterable[str],
    *,
    status: str,
    reason: str | None = None,
    blocking: bool | None = None,
) -> CapabilityRecord:
    return {
        "id": capability_id,
        "status": status,
        "blocking": status != "healthy" if blocking is None else blocking,
        "deps": list(deps),
        "reason": reason,
        "checked_at": _checked_at(),
    }


async def collect_runtime_readiness(app: FastAPI, *, include_live_checks: bool = True) -> Dict[str, Any]:
    runtime_status = _runtime_status(app)
    db_ready = bool(runtime_status.get("db_ready"))
    components = _bootstrap_components(app)
    capabilities: List[CapabilityRecord] = []

    auth_reason: str | None = None
    if settings.is_production and settings.dev_auth_fallback_enabled:
        auth_reason = "Development auth fallback is enabled in production."
    elif _is_default_jwt_secret():
        auth_reason = "JWT secret is not configured for production-grade auth."

    capabilities.append(
        _build_capability(
            "auth.session",
            ["JWT_SECRET_KEY"],
            status="healthy" if auth_reason is None else "unavailable",
            reason=auth_reason,
        )
    )

    saint_storage_ready = db_ready
    saint_storage_reason = None if db_ready else str(runtime_status.get("last_error") or "Persistent saint storage is unavailable.")
    capabilities.append(
        _build_capability(
            "saint.storage",
            ["database.bootstrap"],
            status="healthy" if saint_storage_ready else "unavailable",
            reason=saint_storage_reason,
        )
    )

    for capability_id, component_name in (
        ("joseph.core_family", "family_home"),
        ("joseph.genealogy", "genealogy"),
        ("raphael.governance", "governance"),
        ("raphael.predictions", "health_prediction"),
        ("gabriel.finance", "finance"),
    ):
        ready, reason = _bootstrap_component_ready(app, component_name)
        capabilities.append(
            _build_capability(
                capability_id,
                [f"bootstrap.{component_name}"],
                status="healthy" if ready and db_ready else "unavailable",
                reason=None if ready and db_ready else (reason or runtime_status.get("last_error") or "Runtime bootstrap is unavailable."),
            )
        )

    plaid_ready = settings.plaid_is_configured
    capabilities.append(
        _build_capability(
            "gabriel.plaid",
            ["gabriel.finance", "PLAID_CLIENT_ID", "PLAID_SECRET"],
            status="healthy" if plaid_ready and db_ready else "unavailable",
            reason=None if plaid_ready and db_ready else "Plaid is not configured on this backend.",
        )
    )

    wisegold_deps = [
        "gabriel.finance",
        "WISEGOLD_ORACLE_API_KEY",
    ]
    wisegold_reason = None
    wisegold_ready = db_ready and bool(settings.WISEGOLD_ORACLE_API_KEY.strip())
    if not settings.WISEGOLD_ORACLE_API_KEY.strip():
        wisegold_reason = "WISEGOLD_ORACLE_API_KEY is not configured."
    elif not db_ready:
        wisegold_reason = str(runtime_status.get("last_error") or "Finance runtime is unavailable.")
    capabilities.append(
        _build_capability(
            "gabriel.wisegold",
            wisegold_deps,
            status="healthy" if wisegold_ready else "unavailable",
            reason=wisegold_reason,
        )
    )

    terra_ready, terra_reason = _terra_ready()
    capabilities.append(
        _build_capability(
            "connectors.terra",
            ["TERRA_API_KEY", "TERRA_DEV_ID", "TERRA_WEBHOOK_SECRET"],
            status="healthy" if terra_ready else "unavailable",
            reason=terra_reason,
        )
    )

    smtp_ready, smtp_reason = _smtp_ready()
    capabilities.append(
        _build_capability(
            "notifications.smtp",
            ["SMTP_SERVER", "SMTP_USERNAME", "SMTP_PASSWORD"],
            status="healthy" if smtp_ready else "unavailable",
            reason=smtp_reason,
        )
    )

    voice_table_ready, voice_table_reason = _bootstrap_component_ready(app, "engram")
    voice_storage_ready, voice_storage_reason = _storage_dir_ready(settings.JOSEPH_VOICE_STORAGE_DIR)
    voice_reason = None
    voice_status = "healthy"
    voice_details: Dict[str, Any] = {
        "storage_path": settings.JOSEPH_VOICE_STORAGE_DIR,
        "base_url": settings.resolved_voice_ai_base_url or None,
        "bootstrap_components": components,
    }

    if not db_ready or not voice_table_ready:
        voice_status = "unavailable"
        voice_reason = voice_table_reason or runtime_status.get("last_error") or "Voice persistence is unavailable."
    elif not voice_storage_ready:
        voice_status = "unavailable"
        voice_reason = voice_storage_reason
    elif not settings.resolved_voice_ai_base_url:
        voice_status = "unavailable"
        voice_reason = "Voice AI sidecar is not configured."
    elif include_live_checks:
        health = await voice_ai_service.health()
        voice_details["sidecar"] = health
        if not health.get("available"):
            voice_status = "unavailable"
            voice_reason = str(health.get("message") or "Voice provider is unavailable.")
    else:
        voice_details["sidecar"] = {
            "configured": bool(settings.resolved_voice_ai_base_url),
            "status": "probe-skipped",
        }

    capabilities.append(
        {
            **_build_capability(
                "joseph.voice",
                ["bootstrap.engram", "JOSEPH_VOICE_STORAGE_DIR", "VOICE_AI_BASE_URL"],
                status=voice_status,
                reason=voice_reason,
            ),
            "details": voice_details,
        }
    )

    summary = {
        "healthy": sum(1 for capability in capabilities if capability["status"] == "healthy"),
        "degraded": sum(1 for capability in capabilities if capability["status"] == "degraded"),
        "unavailable": sum(1 for capability in capabilities if capability["status"] == "unavailable"),
    }

    return {
        "status": "healthy" if summary["unavailable"] == 0 and summary["degraded"] == 0 else "degraded",
        "checked_at": _checked_at(),
        "bootstrap_complete": bool(runtime_status.get("bootstrap_complete")),
        "capabilities": capabilities,
        "capability_map": {capability["id"]: capability for capability in capabilities},
        "summary": summary,
    }
