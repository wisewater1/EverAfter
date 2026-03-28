from __future__ import annotations

import base64
from typing import Any, Dict, List

import httpx

from app.config import settings


class ElevenLabsProvider:
    provider_id = "elevenlabs"

    def __init__(self) -> None:
        self.api_key = settings.ELEVENLABS_API_KEY.strip()
        self.base_url = settings.ELEVENLABS_BASE_URL.rstrip("/")
        self.tts_model_id = settings.ELEVENLABS_TTS_MODEL_ID
        self.stt_model_id = settings.ELEVENLABS_STT_MODEL_ID

    @property
    def configured(self) -> bool:
        return bool(self.api_key)

    @property
    def _headers(self) -> Dict[str, str]:
        return {"xi-api-key": self.api_key}

    async def health(self) -> Dict[str, Any]:
        if not self.configured:
            return {
                "status": "unavailable",
                "provider": self.provider_id,
                "configured": False,
                "message": "ELEVENLABS_API_KEY is not configured.",
            }

        try:
            async with httpx.AsyncClient(timeout=5) as client:
                response = await client.get(f"{self.base_url}/models", headers=self._headers)
                response.raise_for_status()
            return {
                "status": "healthy",
                "provider": self.provider_id,
                "configured": True,
            }
        except Exception as exc:
            return {
                "status": "unavailable",
                "provider": self.provider_id,
                "configured": True,
                "message": str(exc),
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
        if not self.configured:
            raise RuntimeError("ELEVENLABS_API_KEY is not configured.")

        files = {"file": (filename, audio_bytes, content_type or "audio/webm")}
        data = {
            "model_id": self.stt_model_id,
            "tag_audio_events": "false",
        }
        if prompt_text or question_text:
            data["language_code"] = "en"

        async with httpx.AsyncClient(timeout=60) as client:
            response = await client.post(
                f"{self.base_url}/speech-to-text",
                headers=self._headers,
                data=data,
                files=files,
            )
            response.raise_for_status()
            payload = response.json() if response.content else {}

        transcript = payload.get("text") or payload.get("transcript") or ""
        confidence = payload.get("language_probability") or payload.get("confidence") or 0.75
        return {
            "transcript": transcript,
            "confidence": float(confidence or 0.0),
            "raw": payload,
        }

    async def create_voice(self, *, name: str, samples: List[Dict[str, Any]]) -> Dict[str, Any]:
        if not self.configured:
            raise RuntimeError("ELEVENLABS_API_KEY is not configured.")

        files = []
        for index, sample in enumerate(samples):
            filename = sample.get("filename") or f"sample-{index + 1}.webm"
            content_type = sample.get("content_type") or "audio/webm"
            audio_bytes = base64.b64decode(sample["audio_base64"])
            files.append(("files", (filename, audio_bytes, content_type)))

        data = {
            "name": name,
            "description": "EverAfter Joseph private family voice profile",
        }

        async with httpx.AsyncClient(timeout=120) as client:
            response = await client.post(
                f"{self.base_url}/voices/add",
                headers=self._headers,
                data=data,
                files=files,
            )
            response.raise_for_status()
            payload = response.json() if response.content else {}

        voice_id = payload.get("voice_id")
        if not voice_id:
            raise RuntimeError("ElevenLabs did not return a voice_id.")

        return {
            "status": "ready",
            "provider": self.provider_id,
            "model_ref": voice_id,
            "raw": payload,
        }

    async def synthesize(self, *, model_ref: str, text: str, voice_style_notes: str | None = None) -> Dict[str, Any]:
        if not self.configured:
            raise RuntimeError("ELEVENLABS_API_KEY is not configured.")

        payload = {
            "text": text,
            "model_id": self.tts_model_id,
        }
        if voice_style_notes:
            payload["text"] = f"{voice_style_notes.strip()}\n\n{text}"

        async with httpx.AsyncClient(timeout=120) as client:
            response = await client.post(
                f"{self.base_url}/text-to-speech/{model_ref}",
                headers={
                    **self._headers,
                    "Accept": "audio/mpeg",
                    "Content-Type": "application/json",
                },
                json=payload,
            )
            response.raise_for_status()
            audio_bytes = response.content

        data_url = f"data:audio/mpeg;base64,{base64.b64encode(audio_bytes).decode('ascii')}"
        return {
            "status": "completed",
            "provider": self.provider_id,
            "audio_url": data_url,
            "output_ref": data_url,
        }
