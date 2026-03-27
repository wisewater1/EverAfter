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
    try:
        payload = jwt.get_unverified_claims(token)

        issuer = str(payload.get("iss") or "")
        if settings.SUPABASE_URL and issuer and not issuer.startswith(settings.SUPABASE_URL):
            raise ValueError("Supabase token issuer mismatch")

        expires_at = payload.get("exp")
        if expires_at is not None:
            now_ts = datetime.now(timezone.utc).timestamp()
            if now_ts >= float(expires_at):
                raise ValueError("Supabase token has expired")

        if "sub" not in payload:
            raise ValueError("Supabase token is missing sub claim")

        return payload
    except JWTError as e:
        raise ValueError(f"Supabase token verification failed: {str(e)}")
