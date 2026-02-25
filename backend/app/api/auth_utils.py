from fastapi import Depends, HTTPException, status
from app.auth.dependencies import get_current_user
from uuid import UUID

async def get_current_user_id(current_user: dict = Depends(get_current_user)) -> str:
    sub = current_user.get("sub")
    if not sub:
        # Local development fallback when sub is missing or token is mocked
        return "demo-user-001"
    
    return str(sub)

async def get_current_user_uuid(current_user: dict = Depends(get_current_user)) -> UUID:
    user_id = await get_current_user_id(current_user)
    try:
        return UUID(user_id)
    except ValueError:
        # Return a fixed UUID for demo users
        return UUID("00000000-0000-0000-0000-000000000001")
