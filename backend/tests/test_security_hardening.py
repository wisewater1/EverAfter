"""Regression tests for the auth-hardening fixes.

- Supabase JWTs must be cryptographically verified (no forgery / impersonation).
- The static demo bypass token must never authenticate in production.
"""

import os

os.environ.setdefault("DATABASE_URL", "postgresql+asyncpg://t:t@localhost:5432/t")

import pytest
from fastapi import FastAPI, Request
from fastapi.testclient import TestClient
from jose import jwt as jose_jwt

from app.auth import jwt as auth_jwt
from app.auth.middleware import JWTAuthMiddleware
from app.core.config import settings

SECRET = "test-supabase-jwt-secret-value"


def _token(secret: str, **claims) -> str:
    payload = {"sub": "user-123", "aud": "authenticated", "exp": 9999999999}
    payload.update(claims)
    return jose_jwt.encode(payload, secret, algorithm="HS256")


def test_valid_supabase_token_verifies(monkeypatch):
    monkeypatch.setattr(settings, "SUPABASE_JWT_SECRET", SECRET)
    monkeypatch.setattr(settings, "SUPABASE_JWT_AUDIENCE", "authenticated")
    monkeypatch.setattr(settings, "SUPABASE_JWT_ISSUER", "")
    monkeypatch.setattr(settings, "SUPABASE_URL", "")
    payload = auth_jwt.verify_supabase_token(_token(SECRET))
    assert payload["sub"] == "user-123"


def test_forged_token_is_rejected(monkeypatch):
    # A token signed with the wrong key must NOT be accepted (was the auth bypass).
    monkeypatch.setattr(settings, "SUPABASE_JWT_SECRET", SECRET)
    monkeypatch.setattr(settings, "SUPABASE_JWT_AUDIENCE", "authenticated")
    with pytest.raises(ValueError):
        auth_jwt.verify_supabase_token(_token("attacker-controlled-secret", sub="victim"))


def test_missing_secret_fails_closed(monkeypatch):
    monkeypatch.setattr(settings, "SUPABASE_JWT_SECRET", "")
    with pytest.raises(ValueError):
        auth_jwt.verify_supabase_token(_token(SECRET))


def test_demo_token_rejected_in_production(monkeypatch):
    monkeypatch.setattr("app.auth.middleware.settings.ALLOW_DEV_AUTH_FALLBACK", False)
    monkeypatch.setattr("app.auth.middleware.settings.ALLOW_PRESENTATION_DEMO_AUTH", True)
    monkeypatch.setattr("app.auth.middleware.settings.DEMO_AUTH_TOKEN", "demo-show-token")
    monkeypatch.setattr("app.auth.middleware.settings.SUPABASE_JWT_SECRET", "")
    monkeypatch.setattr("app.auth.middleware.settings.ENVIRONMENT", "production")

    app = FastAPI()
    app.add_middleware(JWTAuthMiddleware)

    @app.get("/private")
    async def private(request: Request):
        return request.state.current_user

    client = TestClient(app, raise_server_exceptions=False)
    response = client.get("/private", headers={"Authorization": "Bearer demo-show-token"})
    assert response.status_code == 401
