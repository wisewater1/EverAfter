from fastapi import FastAPI, Request
from fastapi.testclient import TestClient

from app.auth.middleware import JWTAuthMiddleware


def test_valid_bearer_token_is_accepted(monkeypatch):
    monkeypatch.setattr(
        "app.auth.middleware.verify_supabase_token",
        lambda _token: {"sub": "00000000-0000-4000-8000-000000000001"},
    )

    app = FastAPI()
    app.add_middleware(JWTAuthMiddleware)

    @app.get("/private")
    async def private(request: Request):
        return request.state.current_user

    client = TestClient(app)
    response = client.get("/private", headers={"Authorization": "Bearer real-token"})

    assert response.status_code == 200
    assert response.json()["id"] == "00000000-0000-4000-8000-000000000001"


def test_invalid_bearer_token_is_rejected(monkeypatch):
    monkeypatch.setattr("app.auth.middleware.verify_supabase_token", lambda _token: (_ for _ in ()).throw(ValueError("invalid token")))
    monkeypatch.setattr("app.auth.middleware.verify_access_token", lambda _token: (_ for _ in ()).throw(ValueError("invalid token")))

    app = FastAPI()
    app.add_middleware(JWTAuthMiddleware)

    @app.get("/private")
    async def private(request: Request):
        return request.state.current_user

    client = TestClient(app)
    response = client.get("/private", headers={"Authorization": "Bearer invalid-token"})

    assert response.status_code == 401
    assert response.json()["detail"].startswith("Authentication failed")
