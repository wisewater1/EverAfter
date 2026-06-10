from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    HOST: str = "0.0.0.0"
    PORT: int = 8020
    VOICE_AI_PROVIDER: str = "elevenlabs"
    VOICE_AI_JOB_STORAGE_DIR: str = "storage/jobs"
    ENVIRONMENT: str = "development"
    ALLOW_DEV_VOICE_PROVIDER: bool = True
    ELEVENLABS_API_KEY: str = ""
    ELEVENLABS_BASE_URL: str = "https://api.elevenlabs.io/v1"
    ELEVENLABS_TTS_MODEL_ID: str = "eleven_multilingual_v2"
    ELEVENLABS_STT_MODEL_ID: str = "scribe_v1"

    model_config = SettingsConfigDict(env_file=".env", case_sensitive=True, extra="ignore")

    @property
    def is_production(self) -> bool:
        return self.ENVIRONMENT.lower() == "production"

    @property
    def dev_voice_provider_enabled(self) -> bool:
        return self.ALLOW_DEV_VOICE_PROVIDER and not self.is_production


settings = Settings()
