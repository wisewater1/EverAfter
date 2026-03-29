from __future__ import annotations

import os
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Dict, Iterable, List

from fastapi import FastAPI

from app.core.config import settings
from app.services.voice_ai_service import voice_ai_service


CapabilityRecord = Dict[str, Any]
RouteGateRecord = Dict[str, Any]


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


def _config_value_ready(*values: str) -> bool:
    return all(str(value or "").strip() for value in values)


ROUTE_DEFINITIONS: List[Dict[str, Any]] = [
    {"path": "/", "deps": [], "prod_exposed": True},
    {"path": "/login", "deps": ["frontend.supabase"], "prod_exposed": True},
    {"path": "/signup", "deps": ["frontend.supabase"], "prod_exposed": True},
    {"path": "/forgot-password", "deps": ["frontend.supabase"], "prod_exposed": True},
    {"path": "/reset-password", "deps": ["frontend.supabase"], "prod_exposed": True},
    {"path": "/onboarding", "deps": ["auth.session", "onboarding.canonical"], "prod_exposed": True},
    {"path": "/dashboard", "deps": ["auth.session", "saint.storage", "onboarding.canonical"], "prod_exposed": True},
    {"path": "/health-dashboard", "deps": ["auth.session", "raphael.hub"], "prod_exposed": True},
    {"path": "/raphael-prototype", "deps": ["auth.session", "raphael.hub"], "prod_exposed": False, "feature_flag": "VITE_ENABLE_NON_CORE_ROUTES"},
    {"path": "/raphael", "deps": ["auth.session", "raphael.hub"], "prod_exposed": True},
    {"path": "/security-dashboard", "deps": ["auth.session", "michael.security"], "prod_exposed": True},
    {"path": "/michael-dashboard", "deps": ["auth.session", "michael.security"], "prod_exposed": True},
    {"path": "/family-dashboard", "deps": ["auth.session", "joseph.core_family", "joseph.genealogy"], "prod_exposed": True},
    {"path": "/anthony-dashboard", "deps": ["auth.session", "anthony.audit"], "prod_exposed": True},
    {"path": "/finance-dashboard", "deps": ["auth.session", "gabriel.finance"], "prod_exposed": True},
    {"path": "/monitor", "deps": ["auth.session", "saint.storage"], "prod_exposed": True},
    {"path": "/trinity", "deps": ["auth.session", "trinity.synapse"], "prod_exposed": True},
    {"path": "/saints", "deps": ["auth.session", "saint.storage"], "prod_exposed": True},
    {"path": "/emergency", "deps": ["auth.session", "raphael.hub"], "prod_exposed": True},
    {"path": "/files", "deps": ["auth.session", "raphael.hub"], "prod_exposed": True},
    {"path": "/my-files", "deps": ["auth.session", "raphael.hub"], "prod_exposed": True},
    {"path": "/devices", "deps": ["auth.session", "devices.terra"], "prod_exposed": True},
    {"path": "/oauth/callback", "deps": ["frontend.supabase"], "prod_exposed": True},
    {"path": "/setup/terra", "deps": ["auth.session", "devices.terra"], "prod_exposed": True},
    {"path": "/terra/return", "deps": ["auth.session", "devices.terra"], "prod_exposed": True},
    {"path": "/career", "deps": ["auth.session", "career.services"], "prod_exposed": True},
    {"path": "/council", "deps": ["auth.session", "council.oracle"], "prod_exposed": True},
    {"path": "/time-capsules", "deps": ["auth.session", "time_capsules.core"], "prod_exposed": True},
    {"path": "/rituals", "deps": ["auth.session", "rituals.core"], "prod_exposed": True},
    {"path": "/personality-training", "deps": ["auth.session", "personality.training"], "prod_exposed": True},
    {"path": "/admin/create-user", "deps": ["frontend.supabase"], "prod_exposed": False, "feature_flag": "VITE_ENABLE_NON_CORE_ROUTES"},
    {"path": "/pricing", "deps": [], "prod_exposed": False, "feature_flag": "VITE_ENABLE_NON_CORE_ROUTES"},
    {"path": "/marketplace", "deps": ["marketplace.core"], "prod_exposed": False, "feature_flag": "VITE_ENABLE_NON_CORE_ROUTES"},
    {"path": "/creator", "deps": ["auth.session", "marketplace.core"], "prod_exposed": False, "feature_flag": "VITE_ENABLE_NON_CORE_ROUTES"},
    {"path": "/my-ais", "deps": ["auth.session", "marketplace.core"], "prod_exposed": False, "feature_flag": "VITE_ENABLE_NON_CORE_ROUTES"},
    {"path": "/portal", "deps": ["auth.session", "saint.storage"], "prod_exposed": True},
    {"path": "/portal/profile", "deps": ["auth.session", "frontend.supabase"], "prod_exposed": True},
    {"path": "/admin/portal", "deps": ["auth.session", "anthony.audit"], "prod_exposed": False, "feature_flag": "VITE_ENABLE_NON_CORE_ROUTES"},
    {"path": "/beyond-modules", "deps": ["auth.session", "saint.storage"], "prod_exposed": False, "feature_flag": "VITE_ENABLE_NON_CORE_ROUTES"},
    {"path": "/dark-glass-carousel", "deps": [], "prod_exposed": False, "feature_flag": "VITE_ENABLE_NON_CORE_ROUTES"},
    {"path": "/dev/device-check", "deps": ["devices.terra"], "prod_exposed": False, "feature_flag": "VITE_ENABLE_NON_CORE_ROUTES"},
    {"path": "/digital-legacy", "deps": ["auth.session", "legacy.vault"], "prod_exposed": True},
    {"path": "/legacy-vault", "deps": ["auth.session", "legacy.vault"], "prod_exposed": True},
    {"path": "/insurance/connect", "deps": ["auth.session", "legacy.vault", "notifications.smtp"], "prod_exposed": False, "feature_flag": "VITE_ENABLE_NON_CORE_ROUTES"},
    {"path": "/insurance", "deps": ["auth.session", "legacy.vault", "notifications.smtp"], "prod_exposed": False, "feature_flag": "VITE_ENABLE_NON_CORE_ROUTES"},
    {"path": "/memorial-services", "deps": ["auth.session", "legacy.vault", "notifications.smtp"], "prod_exposed": False, "feature_flag": "VITE_ENABLE_NON_CORE_ROUTES"},
    {"path": "/career/public/:token", "deps": ["career.services"], "prod_exposed": False, "feature_flag": "VITE_ENABLE_NON_CORE_ROUTES"},
]


def _build_route_gate(definition: Dict[str, Any], capability_map: Dict[str, CapabilityRecord]) -> RouteGateRecord:
    deps = list(definition.get("deps", []))
    blockers: List[CapabilityRecord] = []
    degraded: List[CapabilityRecord] = []

    for dep in deps:
        capability = capability_map.get(dep)
        if capability is None:
            blockers.append(
                {
                    "id": dep,
                    "status": "unavailable",
                    "reason": f"Dependency '{dep}' is not registered in runtime readiness.",
                }
            )
            continue
        if capability["status"] == "healthy":
            continue
        if capability["status"] == "degraded":
            degraded.append(capability)
            continue
        blockers.append(capability)

    status = "healthy"
    reason = None
    if blockers:
        status = "unavailable"
        reason = blockers[0].get("reason") or f"Dependency '{blockers[0]['id']}' is unavailable."
    elif degraded:
        status = "degraded"
        reason = degraded[0].get("reason") or f"Dependency '{degraded[0]['id']}' is degraded."

    return {
        "path": definition["path"],
        "deps": deps,
        "status": status,
        "blocking": status != "healthy",
        "reason": reason,
        "prod_exposed": bool(definition.get("prod_exposed", True)),
        "feature_flag": definition.get("feature_flag"),
        "checked_at": _checked_at(),
    }


async def collect_runtime_readiness(app: FastAPI, *, include_live_checks: bool = True) -> Dict[str, Any]:
    runtime_status = _runtime_status(app)
    db_ready = bool(runtime_status.get("db_ready"))
    components = _bootstrap_components(app)
    capabilities: List[CapabilityRecord] = []

    auth_reason: str | None = None
    if settings.dev_auth_fallback_enabled:
        auth_reason = "Development auth fallback is enabled."
    elif settings.presentation_demo_auth_enabled:
        auth_reason = "Presentation demo auth is enabled."
    elif settings.is_production and _is_default_jwt_secret():
        auth_reason = "JWT secret is not configured for production-grade auth."

    capabilities.append(
        _build_capability(
            "auth.session",
            ["JWT_SECRET_KEY"],
            status="healthy" if auth_reason is None else "unavailable",
            reason=auth_reason,
        )
    )

    supabase_ready = _config_value_ready(settings.SUPABASE_URL, settings.SUPABASE_ANON_KEY)
    capabilities.append(
        _build_capability(
            "frontend.supabase",
            ["SUPABASE_URL", "SUPABASE_ANON_KEY"],
            status="healthy" if supabase_ready else "unavailable",
            reason=None if supabase_ready else "Supabase frontend configuration is incomplete.",
        )
    )

    capabilities.append(
        _build_capability(
            "database.bootstrap",
            ["database.bootstrap"],
            status="healthy" if db_ready else "unavailable",
            reason=None if db_ready else str(runtime_status.get("last_error") or "Database bootstrap is unavailable."),
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

    openai_ready = bool(settings.OPENAI_API_KEY.strip())
    capabilities.append(
        _build_capability(
            "llm.openai",
            ["OPENAI_API_KEY"],
            status="healthy" if openai_ready else "unavailable",
            reason=None if openai_ready else "OPENAI_API_KEY is not configured.",
        )
    )

    for capability_id, component_name in (
        ("joseph.core_family", "family_home"),
        ("joseph.genealogy", "genealogy"),
        ("raphael.hub", "health_prediction"),
        ("raphael.governance", "governance"),
        ("raphael.predictions", "health_prediction"),
        ("gabriel.finance", "finance"),
        ("anthony.audit", "engram"),
        ("michael.security", "engram"),
        ("onboarding.canonical", "engram"),
        ("marketplace.core", "engram"),
        ("legacy.vault", "engram"),
        ("time_capsules.core", "time_capsules"),
        ("rituals.core", "engram"),
        ("personality.training", "engram"),
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

    trinity_component_names = ("family_home", "health_prediction", "finance", "engram")
    trinity_component_results = [_bootstrap_component_ready(app, component_name) for component_name in trinity_component_names]
    trinity_ready = db_ready and openai_ready and all(ready for ready, _reason in trinity_component_results)
    trinity_reason = None
    if not openai_ready:
        trinity_reason = "OpenAI is not configured for Trinity synapse."
    elif not db_ready:
        trinity_reason = str(runtime_status.get("last_error") or "Database bootstrap is unavailable.")
    else:
        first_trinity_error = next((reason for ready, reason in trinity_component_results if not ready and reason), None)
        if first_trinity_error:
            trinity_reason = first_trinity_error

    capabilities.append(
        _build_capability(
            "trinity.synapse",
            [*(f"bootstrap.{name}" for name in trinity_component_names), "llm.openai"],
            status="healthy" if trinity_ready else "unavailable",
            reason=trinity_reason,
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
        "CHAINLINK_RPC_URL",
        "CHAINLINK_XAU_USD_FEED",
    ]
    wisegold_reason = None
    wisegold_ready = (
        db_ready
        and bool(settings.WISEGOLD_ORACLE_API_KEY.strip())
        and bool(settings.CHAINLINK_RPC_URL.strip())
        and bool(settings.CHAINLINK_XAU_USD_FEED.strip())
    )
    if not settings.WISEGOLD_ORACLE_API_KEY.strip():
        wisegold_reason = "WISEGOLD_ORACLE_API_KEY is not configured."
    elif not settings.CHAINLINK_RPC_URL.strip():
        wisegold_reason = "CHAINLINK_RPC_URL is not configured."
    elif not settings.CHAINLINK_XAU_USD_FEED.strip():
        wisegold_reason = "CHAINLINK_XAU_USD_FEED is not configured."
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

    devices_ready = terra_ready and db_ready
    capabilities.append(
        _build_capability(
            "devices.terra",
            ["connectors.terra"],
            status="healthy" if devices_ready else "unavailable",
            reason=None if devices_ready else (terra_reason or "Terra-backed device services are unavailable."),
        )
    )

    career_ready = supabase_ready and openai_ready
    capabilities.append(
        _build_capability(
            "career.services",
            ["frontend.supabase", "llm.openai"],
            status="healthy" if career_ready else "unavailable",
            reason=None if career_ready else ("OpenAI is not configured for career services." if supabase_ready else "Supabase frontend configuration is incomplete."),
        )
    )

    council_ready = db_ready and openai_ready
    capabilities.append(
        _build_capability(
            "council.oracle",
            ["saint.storage", "llm.openai"],
            status="healthy" if council_ready else "unavailable",
            reason=None if council_ready else ("OpenAI is not configured for council deliberation." if db_ready else str(runtime_status.get("last_error") or "Persistent saint storage is unavailable.")),
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

    capability_map = {capability["id"]: capability for capability in capabilities}
    routes = [_build_route_gate(definition, capability_map) for definition in ROUTE_DEFINITIONS]

    return {
        "status": "healthy" if summary["unavailable"] == 0 and summary["degraded"] == 0 else "degraded",
        "checked_at": _checked_at(),
        "bootstrap_complete": bool(runtime_status.get("bootstrap_complete")),
        "capabilities": capabilities,
        "capability_map": capability_map,
        "routes": routes,
        "route_map": {route["path"]: route for route in routes},
        "summary": summary,
    }
