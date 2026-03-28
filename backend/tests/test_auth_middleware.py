from unittest.mock import AsyncMock

from fastapi import FastAPI, Request
from fastapi.testclient import TestClient

from app.auth.middleware import JWTAuthMiddleware


def test_demo_presentation_token_is_accepted(monkeypatch):
    monkeypatch.setattr("app.auth.middleware.settings.ALLOW_DEV_AUTH_FALLBACK", False)
    monkeypatch.setattr("app.auth.middleware.settings.ALLOW_PRESENTATION_DEMO_AUTH", True)
    monkeypatch.setattr("app.auth.middleware.settings.DEMO_AUTH_TOKEN", "demo-show-token")
    monkeypatch.setattr(
        JWTAuthMiddleware,
        "_resolve_demo_user_id",
        AsyncMock(return_value="00000000-0000-4000-8000-000000000001"),
    )

    app = FastAPI()
    app.add_middleware(JWTAuthMiddleware)

    @app.get("/private")
    async def private(request: Request):
        return request.state.current_user

    client = TestClient(app)
    response = client.get("/private", headers={"Authorization": "Bearer demo-show-token"})

    assert response.status_code == 200
    assert response.json()["id"] == "00000000-0000-4000-8000-000000000001"
