from fastapi import Depends, HTTPException, status
from app.auth.dependencies import get_current_user
from uuid import UUID
from app.core.config import settings

async def get_current_user_id(current_user: dict = Depends(get_current_user)) -> str:
    for key in ("sub", "id"):
        value = current_user.get(key)
        if not value:
            continue
        try:
            return str(UUID(str(value)))
        except ValueError:
            continue

    if settings.dev_auth_fallback_enabled and settings.DEV_AUTH_USER_ID:
        return settings.DEV_AUTH_USER_ID

    raise HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="User ID not found in token",
    )

async def get_current_user_uuid(current_user: dict = Depends(get_current_user)) -> UUID:
    user_id = await get_current_user_id(current_user)
    return UUID(user_id)
