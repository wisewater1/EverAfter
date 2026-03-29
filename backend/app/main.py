import asyncio
import logging
import sys
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api import (
    akashic,
    autonomous_tasks,
    causal_twin,
    chat,
    council,
    engrams,
    finance,
    governance,
    health,
    integrity,
    marketplace_assets,
    monitoring,
    personality,
    rituals,
    runtime,
    sacred_state,
    saints,
    social,
    tasks,
    time_capsule,
)
from app.auth.middleware import JWTAuthMiddleware
from app.core.config import settings
from app.services.runtime_readiness import collect_runtime_readiness

if sys.platform == "win32":
    asyncio.set_event_loop_policy(asyncio.WindowsSelectorEventLoopPolicy())

print("====================================================")
print("EVERAFTER BACKEND STARTING ON PORT 8010 (FIXED)")
print("====================================================")

logger = logging.getLogger(__name__)


def _default_subsystem_status() -> dict:
    return {
        "core_api": {
            "availability": "available",
            "ready": True,
        },
        "database": {
            "availability": "starting",
            "ready": False,
            "bootstrap_complete": False,
            "last_error": None,
        },
        "saints": {
            "availability": "starting",
            "builtins_available": True,
            "persistence_available": False,
            "event_listener_enabled": settings.ENABLE_SAINT_EVENT_LISTENER,
            "event_listener_started": False,
            "background_vigils_enabled": settings.ENABLE_SAINT_BACKGROUND_VIGILS,
            "background_vigils_started": False,
            "last_error": None,
        },
    }


def _refresh_subsystem_status(app: FastAPI) -> None:
    runtime_status = getattr(
        app.state,
        "runtime_status",
        {
            "status": "starting",
            "db_ready": False,
            "bootstrap_complete": False,
            "last_error": None,
        },
    )
    subsystem_status = getattr(app.state, "subsystem_status", _default_subsystem_status())

    database_status = subsystem_status["database"]
    database_status.update(
        {
            "availability": "full" if runtime_status["db_ready"] else ("degraded" if runtime_status["bootstrap_complete"] else "starting"),
            "ready": runtime_status["db_ready"],
            "bootstrap_complete": runtime_status["bootstrap_complete"],
            "last_error": runtime_status["last_error"],
        }
    )

    saints_status = subsystem_status["saints"]
    saints_status["persistence_available"] = runtime_status["db_ready"]
    saints_status["availability"] = (
        "full"
        if runtime_status["db_ready"]
        else ("degraded_available" if runtime_status["bootstrap_complete"] or saints_status["event_listener_started"] else "starting")
    )
    if runtime_status["last_error"] and not runtime_status["db_ready"]:
        saints_status["last_error"] = runtime_status["last_error"]

    app.state.subsystem_status = subsystem_status


async def _start_saint_runtime(app: FastAPI) -> None:
    background_tasks = getattr(app.state, "background_tasks", [])
    saints_status = app.state.subsystem_status["saints"]

    if settings.ENABLE_SAINT_EVENT_LISTENER:
        try:
            from app.services.saint_runtime import saint_runtime

            background_tasks.append(
                asyncio.create_task(saint_runtime.listen_for_events(), name="saint-event-listener")
            )
            saints_status["event_listener_started"] = True
        except Exception as exc:
            saints_status["last_error"] = f"Failed to start saint event listener: {exc}"
            logger.exception("Failed to start saint event listener")

    app.state.background_tasks = background_tasks
    _refresh_subsystem_status(app)


async def _start_optional_runtime(app: FastAPI) -> None:
    background_tasks = getattr(app.state, "background_tasks", [])
    saints_status = app.state.subsystem_status["saints"]

    if settings.ENABLE_SAINT_BACKGROUND_VIGILS:
        try:
            from app.services.saint_runtime import saint_runtime

            background_tasks.append(asyncio.create_task(saint_runtime.run_vigils(), name="saint-vigils"))
            saints_status["background_vigils_started"] = True
        except Exception as exc:
            saints_status["last_error"] = f"Failed to start saint vigils: {exc}"
            logger.exception("Failed to start saint vigils")

    if settings.ENABLE_COMPLIANCE_AUTOPILOT:
        try:
            from app.services.compliance_service import compliance_autopilot

            background_tasks.append(
                asyncio.create_task(
                    compliance_autopilot.run_continuous_audits(),
                    name="compliance-autopilot",
                )
            )
        except Exception:
            logger.exception("Failed to start compliance autopilot")

    if settings.ENABLE_WISEGOLD_TICKER:
        try:
            from app.services.wisegold_scheduler import wisegold_scheduler

            background_tasks.append(
                asyncio.create_task(wisegold_scheduler.run_forever(), name="wisegold-scheduler")
            )
        except Exception:
            logger.exception("Failed to start WiseGold scheduler")

    app.state.background_tasks = background_tasks
    _refresh_subsystem_status(app)


async def _bootstrap_runtime(app: FastAPI) -> None:
    from app.services.engram_runtime_tables import ensure_engram_runtime_tables
    from app.services.family_home_runtime_tables import ensure_family_home_tables
    from app.services.finance_runtime_tables import ensure_finance_runtime_tables
    from app.services.genealogy_runtime_tables import ensure_genealogy_tables
    from app.services.governance_runtime_tables import ensure_governance_tables
    from app.services.health_prediction_runtime_tables import ensure_health_prediction_runtime_tables
    from app.services.time_capsule_runtime_tables import ensure_time_capsule_tables
    from app.services.wisegold_scheduler import ensure_wisegold_tables

    state = app.state.runtime_status
    component_results = {}
    bootstrappers = (
        ("engram", ensure_engram_runtime_tables),
        ("genealogy", ensure_genealogy_tables),
        ("family_home", ensure_family_home_tables),
        ("finance", ensure_finance_runtime_tables),
        ("health_prediction", ensure_health_prediction_runtime_tables),
        ("governance", ensure_governance_tables),
        ("time_capsules", ensure_time_capsule_tables),
        ("wisegold", ensure_wisegold_tables),
    )

    try:
        bootstrap_errors = []
        for component_name, bootstrapper in bootstrappers:
            try:
                await asyncio.wait_for(bootstrapper(), timeout=settings.STARTUP_BOOTSTRAP_TIMEOUT_SECONDS)
                component_results[component_name] = {"ready": True, "error": None}
            except Exception as exc:
                component_results[component_name] = {"ready": False, "error": str(exc)}
                bootstrap_errors.append(f"{component_name}: {exc}")

        app.state.bootstrap_components = component_results
        all_components_ready = all(result["ready"] for result in component_results.values())
        state.update(
            {
                "status": "healthy" if all_components_ready else "degraded",
                "db_ready": all_components_ready,
                "bootstrap_complete": True,
                "last_error": None if all_components_ready else "; ".join(bootstrap_errors),
                "bootstrap_components": component_results,
            }
        )
        _refresh_subsystem_status(app)
        if all_components_ready:
            app.state.optional_runtime_task = asyncio.create_task(
                _start_optional_runtime(app),
                name="optional-runtime-bootstrap",
            )
    except asyncio.CancelledError:
        raise
    except Exception as exc:
        logger.exception("Runtime bootstrap failed")
        app.state.bootstrap_components = component_results
        state.update(
            {
                "status": "degraded",
                "db_ready": False,
                "bootstrap_complete": True,
                "last_error": str(exc),
                "bootstrap_components": component_results,
            }
        )
        _refresh_subsystem_status(app)


@asynccontextmanager
async def lifespan(app: FastAPI):
    print("Startup: Initializing resources...")
    app.state.background_tasks = []
    app.state.runtime_status = {
        "status": "starting",
        "db_ready": False,
        "bootstrap_complete": False,
        "last_error": None,
    }
    app.state.bootstrap_components = {}
    app.state.subsystem_status = _default_subsystem_status()
    _refresh_subsystem_status(app)
    await _start_saint_runtime(app)
    app.state.bootstrap_task = asyncio.create_task(_bootstrap_runtime(app), name="runtime-bootstrap")
    yield

    print("Shutdown: Cleaning up resources...")
    bootstrap_task = getattr(app.state, "bootstrap_task", None)
    if bootstrap_task and not bootstrap_task.done():
        bootstrap_task.cancel()
        await asyncio.gather(bootstrap_task, return_exceptions=True)

    optional_runtime_task = getattr(app.state, "optional_runtime_task", None)
    if optional_runtime_task and not optional_runtime_task.done():
        optional_runtime_task.cancel()
        await asyncio.gather(optional_runtime_task, return_exceptions=True)

    for task in getattr(app.state, "background_tasks", []):
        task.cancel()
    if getattr(app.state, "background_tasks", None):
        await asyncio.gather(*app.state.background_tasks, return_exceptions=True)


app = FastAPI(
    title=settings.PROJECT_NAME,
    openapi_url=f"{settings.API_V1_STR}/openapi.json",
    lifespan=lifespan,
)

if settings.BACKEND_CORS_ORIGINS:
    app.add_middleware(
        CORSMiddleware,
        allow_origins=[str(origin) for origin in settings.BACKEND_CORS_ORIGINS],
        allow_origin_regex=settings.CORS_ORIGIN_REGEX or None,
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
app.include_router(health.router)
app.include_router(runtime.router)
app.include_router(social.router)
app.include_router(saints.router)
app.include_router(finance.router)
app.include_router(monitoring.router)
app.include_router(akashic.router)
app.include_router(council.router)
app.include_router(time_capsule.router)
app.include_router(rituals.router)
app.include_router(sacred_state.router)
from app.api import integration

app.include_router(integration.router, prefix="/integration", tags=["integration"])
app.include_router(integrity.router, prefix="/api/v1/integrity", tags=["integrity"])
app.include_router(marketplace_assets.router, prefix="/api/v1/marketplace", tags=["marketplace"])
app.include_router(causal_twin.router)
app.include_router(governance.router)
from app.api import health_predictions

app.include_router(health_predictions.router)
from app.api import media_uploads

app.include_router(media_uploads.router)
from app.api import personality_quiz

app.include_router(personality_quiz.router)
from app.api import joseph_voice

app.include_router(joseph_voice.router)
from app.api import family_home

app.include_router(family_home.router)
from app.api import genealogy

app.include_router(genealogy.router)
from app.api import trinity_api

app.include_router(trinity_api.router)
from app.api import dht_api

app.include_router(dht_api.router)
from app.api import invitations

app.include_router(invitations.router)
from app.api import onboarding

app.include_router(onboarding.router)

from app.api.endpoints import audit

app.include_router(audit.router, prefix="/api/v1/audit", tags=["audit"])


@app.get("/health")
async def health_check():
    runtime_status = getattr(
        app.state,
        "runtime_status",
        {
            "status": "starting",
            "db_ready": False,
            "bootstrap_complete": False,
            "last_error": None,
        },
    )
    probe_safe_readiness = await collect_runtime_readiness(app, include_live_checks=False)
    return {
        "status": runtime_status["status"],
        "service": "EverAfter Autonomous AI API",
        "version": "1.0.0",
        "bootstrap": runtime_status,
        "subsystems": getattr(app.state, "subsystem_status", _default_subsystem_status()),
        "capabilities": probe_safe_readiness["capabilities"],
        "capability_summary": probe_safe_readiness["summary"],
    }


@app.get("/")
async def root():
    return {
        "message": "Welcome to EverAfter Autonomous AI API",
        "docs": "/docs",
        "health": "/health",
    }


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(
        "app.main:app",
        host=settings.HOST,
        port=settings.PORT,
        reload=settings.ENVIRONMENT == "development",
    )
