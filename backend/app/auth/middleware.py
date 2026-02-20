from fastapi import Request, status
from fastapi.responses import JSONResponse
from starlette.middleware.base import BaseHTTPMiddleware
from app.auth.jwt import verify_access_token, verify_supabase_token


class JWTAuthMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        if request.url.path in ["/", "/docs", "/redoc", "/openapi.json", "/health"]:
            return await call_next(request)

        authorization: str = request.headers.get("Authorization")

        # Mock auth for local development if the token is null/missing (similar to node backend)
        if not authorization or authorization.endswith("null") or authorization.endswith("undefined"):
            request.state.current_user = {"sub": "demo-user-001"}
            return await call_next(request)

        if authorization:
            try:
                parts = authorization.split()
                if len(parts) != 2:
                    print(f"DEBUG: Invalid auth header: {authorization[:20]}...")
                    # Fallback to mock user
                    request.state.current_user = {"sub": "demo-user-001"}
                    return await call_next(request)
                
                scheme, token = parts
                if scheme.lower() != "bearer":
                    print(f"DEBUG: Invalid scheme: {scheme}")
                    request.state.current_user = {"sub": "demo-user-001"}
                    return await call_next(request)

                try:
                    payload = verify_supabase_token(token)
                    print(f"DEBUG: Supabase token valid. Sub: {payload.get('sub')}")
                except ValueError as e:
                    print(f"DEBUG: Supabase verification failed: {str(e)}")
                    try:
                        payload = verify_access_token(token)
                        print(f"DEBUG: Access token valid. Sub: {payload.get('sub')}")
                    except ValueError as e2:
                        print(f"DEBUG: Access verification failed: {str(e2)}")
                        # Fallback to mock user
                        request.state.current_user = {"sub": "demo-user-001"}
                        return await call_next(request)

                request.state.current_user = payload

            except Exception as e:
                print(f"DEBUG: Auth Exception: {type(e).__name__}: {str(e)}")
                # Fallback to mock user
                request.state.current_user = {"sub": "demo-user-001"}
                return await call_next(request)
        else:
            print("DEBUG: No authorization header")
            request.state.current_user = {"sub": "demo-user-001"}

        try:
            response = await call_next(request)
            return response
        except Exception as e:
            import traceback
            traceback.print_exc()
            print(f"CRITICAL MIDDLEWARE ERROR: {e}", flush=True)
            raise e
