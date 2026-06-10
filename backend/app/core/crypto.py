"""Stable, domain-separated symmetric encryption for data at rest.

Deriving a Fernet key deterministically from a configured master secret means
ciphertext stays decryptable across process restarts (unlike `Fernet.generate_key()`
called per request, which throws the key away and makes the data unrecoverable).
Distinct `label`s yield distinct keys, so different data classes are not encrypted
under the same key.
"""

from __future__ import annotations

import base64
import hashlib

from cryptography.fernet import Fernet

from app.core.config import settings


def _master_secret(purpose: str) -> str:
    secret = settings.BANK_CONNECTOR_SECRET.strip()
    if not secret:
        # Fail closed in production rather than fall back to the JWT signing secret.
        if settings.is_production:
            raise RuntimeError(
                f"BANK_CONNECTOR_SECRET must be set in production to encrypt {purpose}."
            )
        secret = settings.JWT_SECRET_KEY or "everafter-dev-encryption-secret"
    return secret


def stable_fernet(label: str) -> Fernet:
    """Return a deterministic Fernet bound to (master secret, label)."""
    seed = f"{label}:{_master_secret(label)}".encode("utf-8")
    return Fernet(base64.urlsafe_b64encode(hashlib.sha256(seed).digest()))
