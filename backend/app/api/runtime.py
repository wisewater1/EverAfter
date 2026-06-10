from fastapi import APIRouter, Depends, Request

from app.auth.dependencies import get_current_user
from app.services.runtime_readiness import collect_runtime_readiness


router = APIRouter(prefix="/api/v1/runtime", tags=["runtime"])


@router.get("/readiness")
async def get_runtime_readiness(
    request: Request,
    current_user: dict = Depends(get_current_user),
):
    _ = current_user.get("id") or current_user.get("sub")
    return await collect_runtime_readiness(request.app, include_live_checks=True)
