from __future__ import annotations

import base64
import io
import math
import struct
import uuid
import wave
from typing import Any, Dict, List

from app.config import settings


def _wav_data_url(*, duration_seconds: float = 1.2, frequency_hz: float = 440.0) -> str:
    sample_rate = 16_000
    frame_count = max(int(sample_rate * duration_seconds), 1)
    amplitude = 10_000
    buffer = io.BytesIO()

    with wave.open(buffer, "wb") as wav_file:
        wav_file.setnchannels(1)
        wav_file.setsampwidth(2)
        wav_file.setframerate(sample_rate)
        frames = bytearray()
        for index in range(frame_count):
            sample = int(amplitude * math.sin((2 * math.pi * frequency_hz * index) / sample_rate))
            frames.extend(struct.pack("<h", sample))
        wav_file.writeframes(bytes(frames))

    encoded = base64.b64encode(buffer.getvalue()).decode("ascii")
    return f"data:audio/wav;base64,{encoded}"


class DevLocalVoiceProvider:
    provider_id = "dev-local"

    @property
    def configured(self) -> bool:
        return settings.dev_voice_provider_enabled

    async def health(self) -> Dict[str, Any]:
        if not self.configured:
            return {
                "status": "unavailable",
                "provider": self.provider_id,
                "configured": False,
                "message": "Development voice provider is disabled.",
            }

        return {
            "status": "healthy",
            "provider": self.provider_id,
            "configured": True,
            "message": "Development voice provider is active.",
        }

    async def transcribe(
        self,
        *,
        filename: str,
        audio_bytes: bytes,
        content_type: str,
        prompt_text: str = "",
        question_text: str = "",
    ) -> Dict[str, Any]:
        context = (question_text or prompt_text or "").strip()
        if context:
            transcript = f"I agree. {context}"
        else:
            transcript = f"Development transcript captured from {filename or 'voice sample'}."

        return {
            "transcript": transcript,
            "confidence": 0.91,
            "raw": {
                "provider": self.provider_id,
                "content_type": content_type,
                "byte_length": len(audio_bytes),
            },
        }

    async def create_voice(self, *, name: str, samples: List[Dict[str, Any]]) -> Dict[str, Any]:
        return {
            "status": "ready",
            "provider": self.provider_id,
            "model_ref": f"dev-voice-{uuid.uuid4().hex}",
            "sample_count": len(samples),
            "name": name,
        }

    async def synthesize(self, *, model_ref: str, text: str, voice_style_notes: str | None = None) -> Dict[str, Any]:
        audio_url = _wav_data_url(duration_seconds=max(0.8, min(len(text) / 90.0, 2.4)))
        return {
            "status": "completed",
            "provider": self.provider_id,
            "audio_url": audio_url,
            "output_ref": audio_url,
            "model_ref": model_ref,
            "voice_style_notes": voice_style_notes,
        }
