import base64
import hashlib
from typing import Any, Dict, Optional

import httpx
from cryptography.fernet import Fernet

from app.core.config import settings


class PlaidConfigurationError(RuntimeError):
    pass


class PlaidAPIError(RuntimeError):
    pass


PLAID_BASE_URLS = {
    "sandbox": "https://sandbox.plaid.com",
    "development": "https://development.plaid.com",
    "production": "https://production.plaid.com",
}


def _build_fernet_key() -> bytes:
    configured_secret = settings.BANK_CONNECTOR_SECRET.strip()
    seed = configured_secret or settings.JWT_SECRET_KEY or "everafter-dev-bank-connector"
    return base64.urlsafe_b64encode(hashlib.sha256(seed.encode("utf-8")).digest())


class PlaidService:
    def __init__(self) -> None:
        self.base_url = PLAID_BASE_URLS.get(settings.PLAID_ENV.lower(), PLAID_BASE_URLS["sandbox"])
        self.fernet = Fernet(_build_fernet_key())

    @staticmethod
    def is_configured() -> bool:
        return settings.plaid_is_configured

    def encrypt_access_token(self, access_token: str) -> str:
        return self.fernet.encrypt(access_token.encode("utf-8")).decode("utf-8")

    def decrypt_access_token(self, encrypted_token: str) -> str:
        return self.fernet.decrypt(encrypted_token.encode("utf-8")).decode("utf-8")

    async def _post(self, path: str, payload: Dict[str, Any]) -> Dict[str, Any]:
        if not self.is_configured():
            raise PlaidConfigurationError("Plaid is not configured on this backend")

        request_payload = {
            "client_id": settings.PLAID_CLIENT_ID,
            "secret": settings.PLAID_SECRET,
            **payload,
        }

        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.post(f"{self.base_url}{path}", json=request_payload)

        try:
            data = response.json()
        except ValueError:
            data = {"error_message": response.text}

        if response.status_code >= 400:
            message = data.get("error_message") or data.get("display_message") or response.reason_phrase
            raise PlaidAPIError(message)

        return data

    async def create_link_token(self, user_id: str) -> Dict[str, Any]:
        payload: Dict[str, Any] = {
            "client_name": "EverAfter",
            "country_codes": settings.plaid_country_codes_list or ["US"],
            "language": "en",
            "products": settings.plaid_products_list or ["transactions"],
            "user": {"client_user_id": user_id},
        }
        if settings.PLAID_REDIRECT_URI.strip():
            payload["redirect_uri"] = settings.PLAID_REDIRECT_URI.strip()
        if settings.PLAID_WEBHOOK_URL.strip():
            payload["webhook"] = settings.PLAID_WEBHOOK_URL.strip()
        return await self._post("/link/token/create", payload)

    async def exchange_public_token(self, public_token: str) -> Dict[str, Any]:
        return await self._post("/item/public_token/exchange", {"public_token": public_token})

    async def get_accounts(self, access_token: str) -> Dict[str, Any]:
        return await self._post("/accounts/get", {"access_token": access_token})

    async def transactions_sync(self, access_token: str, cursor: Optional[str] = None) -> Dict[str, Any]:
        payload: Dict[str, Any] = {
            "access_token": access_token,
            "count": 100,
        }
        if cursor:
            payload["cursor"] = cursor
        return await self._post("/transactions/sync", payload)
