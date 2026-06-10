from datetime import datetime, timedelta, timezone
from typing import Optional, Dict, Any
from jose import JWTError, jwt
from app.core.config import settings


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
        raise ValueError(
            "SUPABASE_JWT_SECRET is not configured; refusing to trust an "
            "unverifiable Supabase token"
        )

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
