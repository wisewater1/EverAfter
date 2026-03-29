from typing import List
from urllib.parse import quote, unquote, urlsplit, urlunsplit

from pydantic import AliasChoices, Field
from pydantic_settings import BaseSettings, SettingsConfigDict


def _extract_supabase_project_ref(supabase_url: str) -> str:
    try:
        host = urlsplit(supabase_url).hostname or ""
    except Exception:
        return ""
    return host.split(".")[0] if host else ""


def _normalize_database_url(raw_url: str, supabase_url: str, *, force_direct_host: bool = False) -> str:
    database_url = str(raw_url or "").strip()
    if not database_url:
        return database_url

    if database_url.startswith("postgres://"):
        database_url = database_url.replace("postgres://", "postgresql+asyncpg://", 1)
    elif database_url.startswith("postgresql://"):
        database_url = database_url.replace("postgresql://", "postgresql+asyncpg://", 1)

    parsed = urlsplit(database_url)
    hostname = parsed.hostname or ""
    if not hostname.endswith(".pooler.supabase.com") or not force_direct_host:
        return database_url

    username = unquote(parsed.username or "")
    password = unquote(parsed.password or "")
    project_ref = ""

    if username.startswith("postgres."):
        project_ref = username.split(".", 1)[1]
    if not project_ref:
        project_ref = _extract_supabase_project_ref(supabase_url)
    if not project_ref or not password:
        return database_url

    direct_netloc = f"{quote('postgres', safe='')}:{quote(password, safe='')}@db.{project_ref}.supabase.co:5432"
    return urlunsplit((
        parsed.scheme or "postgresql+asyncpg",
        direct_netloc,
        parsed.path or "/postgres",
        parsed.query,
        parsed.fragment,
    ))


def _looks_like_placeholder_database_url(raw_url: str) -> bool:
    candidate = str(raw_url or "").strip()
    if not candidate:
        return True

    upper_candidate = candidate.upper()
    placeholder_markers = (
        "YOUR-PASSWORD",
        "YOUR_PASSWORD",
        "YOUR_PROJECT_REF",
        "<DB_PASSWORD>",
        "<YOUR-PASSWORD>",
        "PASSWORD_HERE",
    )
    return any(marker in upper_candidate for marker in placeholder_markers)


def _expand_loopback_origins(origins: List[str]) -> List[str]:
    expanded: List[str] = []

    for origin in origins:
        normalized = origin.strip()
        if not normalized:
            continue
        if normalized not in expanded:
            expanded.append(normalized)

        if "://localhost" in normalized:
            loopback_variant = normalized.replace("://localhost", "://127.0.0.1", 1)
            if loopback_variant not in expanded:
                expanded.append(loopback_variant)
        elif "://127.0.0.1" in normalized:
            localhost_variant = normalized.replace("://127.0.0.1", "://localhost", 1)
            if localhost_variant not in expanded:
                expanded.append(localhost_variant)

    return expanded


class Settings(BaseSettings):
    DATABASE_URL: str
    PRISMA_DATABASE_URL: str = ""
    OPRISMA_DATABASE_URL: str = ""
    SUPABASE_URL: str = Field(default="", validation_alias=AliasChoices("SUPABASE_URL", "VITE_SUPABASE_URL"))
    SUPABASE_ANON_KEY: str = Field(default="", validation_alias=AliasChoices("SUPABASE_ANON_KEY", "VITE_SUPABASE_ANON_KEY"))
    SUPABASE_SERVICE_ROLE_KEY: str = Field(default="", validation_alias=AliasChoices("SUPABASE_SERVICE_ROLE_KEY", "VITE_SUPABASE_SERVICE_ROLE_KEY"))
    SUPABASE_JWT_ISSUER: str = ""
    SUPABASE_JWT_AUDIENCE: str = "authenticated"

    JWT_SECRET_KEY: str = ""
    JWT_ALGORITHM: str = "HS256"
    TOKEN_EXPIRE_MINUTES: int = 43200

    API_V1_STR: str = "/api/v1"
    PROJECT_NAME: str = "EverAfter Autonomous AI API"

    HF_MODEL_NAME: str = "sentence-transformers/all-MiniLM-L6-v2"
    OPENAI_API_KEY: str = ""
    CHAINLINK_RPC_URL: str = ""
    CHAINLINK_XAU_USD_FEED: str = ""
    PLAID_CLIENT_ID: str = ""
    PLAID_SECRET: str = ""
    PLAID_ENV: str = "sandbox"
    PLAID_PRODUCTS: str = "transactions"
    PLAID_COUNTRY_CODES: str = "US"
    PLAID_REDIRECT_URI: str = ""
    PLAID_WEBHOOK_URL: str = ""
    BANK_CONNECTOR_SECRET: str = ""
    WISEGOLD_ORACLE_API_KEY: str = ""
    WGOLD_TOKEN_CONTRACT: str = ""
    WGOLD_REPUTATION_ORACLE_CONTRACT: str = ""
    WGOLD_POLICY_CONTROLLER_CONTRACT: str = ""
    WGOLD_COVENANT_VERIFIER_CONTRACT: str = ""
    WISEGOLD_CHAINLINK_ROUTER: str = ""
    WISEGOLD_CHAINLINK_DON_ID: str = ""
    WISEGOLD_AUTOMATION_REGISTRAR: str = ""
    WISEGOLD_AUTOMATION_REGISTRY: str = ""
    VOICE_AI_BASE_URL: str = ""
    VOICE_AI_DEV_BASE_URL: str = "http://127.0.0.1:8020"
    VOICE_AI_TIMEOUT_SECONDS: int = 20
    VOICE_AI_HEALTH_TIMEOUT_SECONDS: int = 3
    JOSEPH_VOICE_STORAGE_DIR: str = "storage/joseph_voice"
    JOSEPH_VOICE_MIN_APPROVED_SAMPLES: int = 6
    JOSEPH_VOICE_MIN_APPROVED_SECONDS: int = 90
    JOSEPH_READ_SQL_TIMEOUT_SECONDS: float = 2.5
    TERRA_API_KEY: str = ""
    TERRA_DEV_ID: str = ""
    TERRA_WEBHOOK_SECRET: str = ""

    OLLAMA_URL: str = "http://localhost:11434"
    OLLAMA_MODEL: str = "mistral"

    NATIVE_LLM_MODEL: str = "Llama-3.2-1B-Instruct-Q4_K_M.gguf"
    LOCAL_MODELS_DIR: str = "models"

    REDIS_URL: str = "redis://localhost:6379/0"
    DB_CONNECT_TIMEOUT_SECONDS: float = 10.0
    DB_COMMAND_TIMEOUT_SECONDS: float = 30.0
    DB_POOL_TIMEOUT_SECONDS: float = 15.0
    STARTUP_BOOTSTRAP_TIMEOUT_SECONDS: float = 45.0
    SUPABASE_DB_FORCE_DIRECT_HOST: bool = False
    SAINT_FALLBACK_STORAGE_DIR: str = "storage/saint_memory"

    HOST: str = "0.0.0.0"
    PORT: int = 8010
    CORS_ORIGINS: str = "http://localhost:5173,http://127.0.0.1:5173,http://localhost:3000,http://127.0.0.1:3000,http://localhost:5000,http://127.0.0.1:5000,https://everafterai.net,https://www.everafterai.net"
    CORS_ORIGIN_REGEX: str = r"^https://.*\.netlify\.app$"

    ENVIRONMENT: str = "development"
    ALLOW_DEV_AUTH_FALLBACK: bool = False
    ALLOW_PRESENTATION_DEMO_AUTH: bool = False
    DEMO_AUTH_TOKEN: str = ""
    ALLOW_DEV_VOICE_PROVIDER: bool = True
    DEV_AUTH_USER_ID: str = ""
    ENABLE_SAINT_EVENT_LISTENER: bool = True
    ENABLE_SAINT_BACKGROUND_VIGILS: bool = False
    ENABLE_COMPLIANCE_AUTOPILOT: bool = False
    ENABLE_WISEGOLD_TICKER: bool = True
    WISEGOLD_TICK_CHECK_SECONDS: int = 300
    WISEGOLD_TICK_INTERVAL_HOURS: int = 24
    SAINT_ACTION_AUTO_APPROVE: bool = False

    model_config = SettingsConfigDict(
        env_file=".env",
        case_sensitive=True,
        extra="ignore",
    )

    @property
    def BACKEND_CORS_ORIGINS(self) -> List[str]:
        return _expand_loopback_origins([origin.strip() for origin in self.CORS_ORIGINS.split(",")])

    @property
    def database_url_normalized(self) -> str:
        candidates = [
            self.DATABASE_URL,
            self.PRISMA_DATABASE_URL,
            self.OPRISMA_DATABASE_URL,
        ]

        for raw_url in candidates:
            if _looks_like_placeholder_database_url(raw_url):
                continue
            return _normalize_database_url(
                raw_url,
                self.SUPABASE_URL,
                force_direct_host=self.SUPABASE_DB_FORCE_DIRECT_HOST,
            )

        return _normalize_database_url(
            self.DATABASE_URL,
            self.SUPABASE_URL,
            force_direct_host=self.SUPABASE_DB_FORCE_DIRECT_HOST,
        )

    @property
    def cors_origins_list(self) -> List[str]:
        return _expand_loopback_origins([origin.strip() for origin in self.CORS_ORIGINS.split(",")])

    @property
    def is_production(self) -> bool:
        return self.ENVIRONMENT.lower() == "production"

    @property
    def dev_auth_fallback_enabled(self) -> bool:
        return self.ALLOW_DEV_AUTH_FALLBACK and not self.is_production

    @property
    def presentation_demo_auth_enabled(self) -> bool:
        return (
            self.ALLOW_PRESENTATION_DEMO_AUTH
            and not self.is_production
            and bool(self.DEMO_AUTH_TOKEN.strip())
        )

    @property
    def dev_voice_provider_enabled(self) -> bool:
        return self.ALLOW_DEV_VOICE_PROVIDER and not self.is_production

    @property
    def resolved_voice_ai_base_url(self) -> str:
        configured = self.VOICE_AI_BASE_URL.strip().rstrip("/")
        if configured:
            return configured
        if self.dev_voice_provider_enabled:
            return self.VOICE_AI_DEV_BASE_URL.strip().rstrip("/")
        return ""

    @property
    def saint_action_auto_approve_enabled(self) -> bool:
        return self.SAINT_ACTION_AUTO_APPROVE and not self.is_production

    @property
    def plaid_products_list(self) -> List[str]:
        return [value.strip() for value in self.PLAID_PRODUCTS.split(",") if value.strip()]

    @property
    def plaid_country_codes_list(self) -> List[str]:
        return [value.strip() for value in self.PLAID_COUNTRY_CODES.split(",") if value.strip()]

    @property
    def plaid_is_configured(self) -> bool:
        return bool(self.PLAID_CLIENT_ID.strip() and self.PLAID_SECRET.strip())


settings = Settings()
