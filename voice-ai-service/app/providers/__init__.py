from app.config import settings
from app.providers.dev_local import DevLocalVoiceProvider
from app.providers.elevenlabs import ElevenLabsProvider


def get_provider():
    provider_name = settings.VOICE_AI_PROVIDER.strip().lower()
    if provider_name == "dev-local":
        return DevLocalVoiceProvider()
    if provider_name in {"", "elevenlabs"}:
        if settings.dev_voice_provider_enabled and not settings.ELEVENLABS_API_KEY.strip():
            return DevLocalVoiceProvider()
        return ElevenLabsProvider()
    raise RuntimeError(f"Unsupported VOICE_AI_PROVIDER: {settings.VOICE_AI_PROVIDER}")
