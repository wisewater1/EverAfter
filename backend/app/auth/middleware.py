from fastapi import Request, status
from fastapi.responses import JSONResponse
from starlette.middleware.base import BaseHTTPMiddleware

from app.auth.jwt import verify_access_token, verify_supabase_token

PUBLIC_PATHS = {"/", "/docs", "/redoc", "/openapi.json", "/api/v1/openapi.json", "/health"}


class JWTAuthMiddleware(BaseHTTPMiddleware):
    @staticmethod
    def _unauthorized_response(detail: str) -> JSONResponse:
        return JSONResponse(
            status_code=status.HTTP_401_UNAUTHORIZED,
            content={"detail": detail},
            headers={"WWW-Authenticate": "Bearer"},
        )

    async def dispatch(self, request: Request, call_next):
        if request.method.upper() == "OPTIONS":
            return await call_next(request)

        if request.url.path in PUBLIC_PATHS:
            return await call_next(request)

        authorization = (request.headers.get("Authorization") or "").strip()

        if not authorization or authorization.endswith("null") or authorization.endswith("undefined"):
            return self._unauthorized_response("Not authenticated")

        try:
            parts = authorization.split()
            if len(parts) != 2:
                return self._unauthorized_response("Invalid authorization header")

            scheme, token = parts
            if scheme.lower() != "bearer":
                return self._unauthorized_response("Invalid authorization scheme")

            try:
                payload = verify_supabase_token(token)
            except ValueError:
                payload = verify_access_token(token)

            if "id" not in payload and "sub" in payload:
                payload["id"] = payload["sub"]
            request.state.current_user = payload
        except Exception as exc:
            return self._unauthorized_response(f"Authentication failed: {exc}")

        try:
            response = await call_next(request)
            return response
        except Exception as e:
            import traceback

            traceback.print_exc()
            print(f"CRITICAL MIDDLEWARE ERROR: {e}", flush=True)
            raise e
