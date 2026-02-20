from fastapi import Request, status
from fastapi.responses import JSONResponse
from starlette.middleware.base import BaseHTTPMiddleware
from app.auth.jwt import verify_access_token, verify_supabase_token


class JWTAuthMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        if request.url.path in ["/", "/docs", "/redoc", "/openapi.json", "/health"]:
            return await call_next(request)

        authorization: str = request.headers.get("Authorization")

        if authorization:
            try:
                parts = authorization.split()
                if len(parts) != 2:
                    print(f"DEBUG: Invalid auth header: {authorization[:20]}...")
                    return JSONResponse(
                        status_code=status.HTTP_401_UNAUTHORIZED,
                        content={"detail": "Invalid authorization header format"}
                    )
                
                scheme, token = parts
                if scheme.lower() != "bearer":
                    print(f"DEBUG: Invalid scheme: {scheme}")
                    return JSONResponse(
                        status_code=status.HTTP_401_UNAUTHORIZED,
                        content={"detail": "Invalid authentication scheme"}
                    )

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
                        return JSONResponse(
                            status_code=status.HTTP_401_UNAUTHORIZED,
                            content={"detail": str(e2)}
                        )

                request.state.current_user = payload

            except Exception as e:
                print(f"DEBUG: Auth Exception: {type(e).__name__}: {str(e)}")
                return JSONResponse(
                    status_code=status.HTTP_401_UNAUTHORIZED,
                    content={"detail": f"Authentication failed: {str(e)}"}
                )
        else:
            print("DEBUG: No authorization header")
            request.state.current_user = None

        try:
            response = await call_next(request)
            return response
        except Exception as e:
            import traceback
            traceback.print_exc()
            print(f"CRITICAL MIDDLEWARE ERROR: {e}", flush=True)
            raise e
