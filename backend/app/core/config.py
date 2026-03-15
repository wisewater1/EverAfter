from typing import List

from pydantic import AliasChoices, Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    DATABASE_URL: str
    SUPABASE_URL: str = Field(default="", validation_alias=AliasChoices("SUPABASE_URL", "VITE_SUPABASE_URL"))
    SUPABASE_ANON_KEY: str = Field(default="", validation_alias=AliasChoices("SUPABASE_ANON_KEY", "VITE_SUPABASE_ANON_KEY"))
    SUPABASE_SERVICE_ROLE_KEY: str = Field(default="", validation_alias=AliasChoices("SUPABASE_SERVICE_ROLE_KEY", "VITE_SUPABASE_SERVICE_ROLE_KEY"))

    JWT_SECRET_KEY: str = "dev-jwt-secret"
    JWT_ALGORITHM: str = "HS256"
    TOKEN_EXPIRE_MINUTES: int = 43200

    API_V1_STR: str = "/api/v1"
    PROJECT_NAME: str = "EverAfter Autonomous AI API"

    HF_MODEL_NAME: str = "sentence-transformers/all-MiniLM-L6-v2"
    OPENAI_API_KEY: str = ""
    CHAINLINK_RPC_URL: str = ""
    CHAINLINK_XAU_USD_FEED: str = ""
    WISEGOLD_ORACLE_API_KEY: str = ""
    WGOLD_TOKEN_CONTRACT: str = ""
    WGOLD_REPUTATION_ORACLE_CONTRACT: str = ""
    WISEGOLD_CHAINLINK_ROUTER: str = ""
    WISEGOLD_CHAINLINK_DON_ID: str = ""

    OLLAMA_URL: str = "http://localhost:11434"
    OLLAMA_MODEL: str = "mistral"

    NATIVE_LLM_MODEL: str = "Llama-3.2-1B-Instruct-Q4_K_M.gguf"
    LOCAL_MODELS_DIR: str = "models"

    REDIS_URL: str = "redis://localhost:6379/0"

    HOST: str = "0.0.0.0"
    PORT: int = 8010
    CORS_ORIGINS: str = "http://localhost:5173,http://localhost:3000,http://localhost:5000,https://everafterai.net,https://www.everafterai.net"
    CORS_ORIGIN_REGEX: str = r"^https://.*\.netlify\.app$"

    ENVIRONMENT: str = "development"
    ALLOW_DEV_AUTH_FALLBACK: bool = True
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
        return [origin.strip() for origin in self.CORS_ORIGINS.split(",")]

    @property
    def cors_origins_list(self) -> List[str]:
        return [origin.strip() for origin in self.CORS_ORIGINS.split(",")]

    @property
    def is_production(self) -> bool:
        return self.ENVIRONMENT.lower() == "production"

    @property
    def dev_auth_fallback_enabled(self) -> bool:
        return self.ALLOW_DEV_AUTH_FALLBACK and not self.is_production

    @property
    def saint_action_auto_approve_enabled(self) -> bool:
        return self.SAINT_ACTION_AUTO_APPROVE and not self.is_production


settings = Settings()
