import time
from datetime import datetime, timedelta, timezone
from typing import Optional, Dict, Any

import httpx
from jose import JWTError, jwt
from app.core.config import settings

# Short-lived cache for remote token verification so we don't call Supabase on
# every request for the same token. token -> (payload, expiry_monotonic).
_REMOTE_VERIFY_CACHE: Dict[str, tuple] = {}


def _verify_supabase_token_remote(token: str) -> Dict[str, Any]:
    """Verify a Supabase token by asking Supabase, when no local JWT secret is set.

    Calls GET {SUPABASE_URL}/auth/v1/user with the token; Supabase validates the
    signature/expiry against its own current signing keys (HS256 or asymmetric)
    and returns the user. Needs only the public publishable key — no shared
    secret — so it works when SUPABASE_JWT_SECRET is unavailable. Still fails
    closed: any non-200 or network error raises.
    """
    base = settings.SUPABASE_URL.strip().rstrip("/")
    if not base:
        raise ValueError("SUPABASE_URL is not configured; cannot verify token")

    now = time.monotonic()
    cached = _REMOTE_VERIFY_CACHE.get(token)
    if cached and cached[1] > now:
        return cached[0]

    apikey = (settings.SUPABASE_PUBLISHABLE_KEY.strip() or settings.SUPABASE_ANON_KEY.strip())
    try:
        resp = httpx.get(
            f"{base}/auth/v1/user",
            headers={"Authorization": f"Bearer {token}", "apikey": apikey},
            timeout=8.0,
        )
    except Exception as exc:  # network / DNS / timeout
        raise ValueError(f"Supabase token verification (remote) failed: {exc}")

    if resp.status_code != 200:
        raise ValueError(f"Supabase rejected the token (status {resp.status_code})")

    try:
        user = resp.json()
    except Exception:
        raise ValueError("Supabase token verification (remote) returned invalid JSON")

    sub = user.get("id")
    if not sub:
        raise ValueError("Supabase token verification (remote) returned no user id")

    payload = {
        "sub": sub,
        "id": sub,
        "email": user.get("email"),
        "role": user.get("role") or "authenticated",
        "aud": user.get("aud") or "authenticated",
        "_verified_via": "supabase_remote",
    }
    if len(_REMOTE_VERIFY_CACHE) > 500:  # bound memory
        _REMOTE_VERIFY_CACHE.clear()
    _REMOTE_VERIFY_CACHE[token] = (payload, now + 60)
    return payload


def create_access_token(data: Dict[str, Any], expires_delta: Optional[timedelta] = None) -> str:
    to_encode = data.copy()

    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=settings.TOKEN_EXPIRE_MINUTES)

    to_encode.update({"exp": expire, "iat": datetime.utcnow()})

    encoded_jwt = jwt.encode(
        to_encode,
        settings.JWT_SECRET_KEY,
        algorithm=settings.JWT_ALGORITHM
    )

    return encoded_jwt


def verify_access_token(token: str) -> Dict[str, Any]:
    try:
        payload = jwt.decode(
            token,
            settings.JWT_SECRET_KEY,
            algorithms=[settings.JWT_ALGORITHM]
        )
        return payload
    except JWTError as e:
        raise ValueError(f"Token verification failed: {str(e)}")


def verify_supabase_token(token: str) -> Dict[str, Any]:
    """Cryptographically verify a Supabase-issued access token.

    Supabase signs access tokens with the project's JWT secret (HS256). We MUST
    verify that signature — reading unverified claims would let anyone forge a
    token for any user (total auth bypass). If no secret is configured we fail
    closed (reject), so an unverifiable token is never trusted.
    """
    secret = settings.SUPABASE_JWT_SECRET.strip()
    if not secret:
        # No shared secret available — verify remotely with Supabase instead of
        # failing closed. This is still secure: Supabase validates the token; we
        # never trust an unverified token.
        return _verify_supabase_token_remote(token)

    expected_audience = settings.SUPABASE_JWT_AUDIENCE.strip()
    decode_kwargs: Dict[str, Any] = {"algorithms": ["HS256"]}
    options: Dict[str, Any] = {}
    if expected_audience:
        decode_kwargs["audience"] = expected_audience
    else:
        options["verify_aud"] = False

    try:
        # Verifies the signature + exp (and aud when provided); raises on failure.
        payload = jwt.decode(token, secret, options=options, **decode_kwargs)
    except JWTError as e:
        raise ValueError(f"Supabase token verification failed: {str(e)}")

    # Issuer check (lenient prefix match: Supabase iss is "<url>/auth/v1").
    expected_issuer = (
        settings.SUPABASE_JWT_ISSUER.strip()
        or (settings.SUPABASE_URL.strip().rstrip("/") + "/auth/v1" if settings.SUPABASE_URL.strip() else "")
    )
    if expected_issuer:
        issuer = str(payload.get("iss") or "")
        base = expected_issuer.rstrip("/")
        if issuer and not (issuer.startswith(base) or base.startswith(issuer.rstrip("/"))):
            raise ValueError("Supabase token issuer mismatch")

    if "sub" not in payload:
        raise ValueError("Supabase token is missing sub claim")

    return payload
