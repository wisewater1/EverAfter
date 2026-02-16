from fastapi import Depends, HTTPException, status, Request
from typing import Dict, Any, Optional


async def get_current_user(request: Request) -> Dict[str, Any]:
    if not hasattr(request.state, "current_user") or request.state.current_user is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Not authenticated",
            headers={"WWW-Authenticate": "Bearer"},
        )
    return request.state.current_user


async def get_optional_user(request: Request) -> Optional[Dict[str, Any]]:
    if hasattr(request.state, "current_user"):
        return request.state.current_user
    return None
