from fastapi import Request, status
from fastapi.responses import JSONResponse
from starlette.middleware.base import BaseHTTPMiddleware
from typing import Optional
from sqlalchemy import text

from app.auth.jwt import verify_access_token, verify_supabase_token
from app.core.config import settings
from app.db.session import get_session_factory

DEFAULT_DEMO_USER_ID = "00000000-0000-0000-0000-000000000001"
PUBLIC_PATHS = {"/", "/docs", "/redoc", "/openapi.json", "/api/v1/openapi.json", "/health"}
_demo_user_id_cache: Optional[str] = None


class JWTAuthMiddleware(BaseHTTPMiddleware):
    @staticmethod
    async def _resolve_demo_user_id() -> str:
        global _demo_user_id_cache

        if settings.DEV_AUTH_USER_ID:
            return settings.DEV_AUTH_USER_ID

        if _demo_user_id_cache:
            return _demo_user_id_cache

        try:
            session_factory = get_session_factory()
            async with session_factory() as session:
                result = await session.execute(text("select id::text from profiles order by created_at asc limit 1"))
                profile_id = result.scalar_one_or_none()
                if profile_id:
                    _demo_user_id_cache = profile_id
                    return profile_id
        except Exception:
            pass

        return DEFAULT_DEMO_USER_ID

    @classmethod
    async def _apply_demo_user(cls, request: Request) -> None:
        demo_user_id = await cls._resolve_demo_user_id()
        request.state.current_user = {"id": demo_user_id, "sub": demo_user_id}

    @staticmethod
    def _unauthorized_response(detail: str) -> JSONResponse:
        return JSONResponse(
            status_code=status.HTTP_401_UNAUTHORIZED,
            content={"detail": detail},
            headers={"WWW-Authenticate": "Bearer"},
        )

    async def _fallback_or_unauthorized(self, request: Request, detail: str) -> Optional[JSONResponse]:
        if settings.dev_auth_fallback_enabled:
            await self._apply_demo_user(request)
            return None
        return self._unauthorized_response(detail)

    async def dispatch(self, request: Request, call_next):
        if request.url.path in PUBLIC_PATHS:
            return await call_next(request)

        authorization = (request.headers.get("Authorization") or "").strip()

        if not authorization or authorization.endswith("null") or authorization.endswith("undefined"):
            fallback_response = await self._fallback_or_unauthorized(request, "Not authenticated")
            if fallback_response is not None:
                return fallback_response
            return await call_next(request)

        try:
            parts = authorization.split()
            if len(parts) != 2:
                fallback_response = await self._fallback_or_unauthorized(request, "Invalid authorization header")
                if fallback_response is not None:
                    return fallback_response
                return await call_next(request)

            scheme, token = parts
            if scheme.lower() != "bearer":
                fallback_response = await self._fallback_or_unauthorized(request, "Invalid authorization scheme")
                if fallback_response is not None:
                    return fallback_response
                return await call_next(request)

            try:
                payload = verify_supabase_token(token)
            except ValueError:
                payload = verify_access_token(token)

            if "id" not in payload and "sub" in payload:
                payload["id"] = payload["sub"]
            request.state.current_user = payload
        except Exception as exc:
            fallback_response = await self._fallback_or_unauthorized(request, f"Authentication failed: {exc}")
            if fallback_response is not None:
                return fallback_response
            return await call_next(request)

        try:
            response = await call_next(request)
            return response
        except Exception as e:
            import traceback

            traceback.print_exc()
            print(f"CRITICAL MIDDLEWARE ERROR: {e}", flush=True)
            raise e
