from __future__ import annotations

from typing import Any, Dict, Optional

import httpx

from app.core.config import settings


class VoiceAIUnavailableError(RuntimeError):
    pass


class VoiceAIService:
    def __init__(self) -> None:
        self.base_url = (settings.VOICE_AI_BASE_URL or "").rstrip("/")
        self.timeout = settings.VOICE_AI_TIMEOUT_SECONDS
        self.health_timeout = settings.VOICE_AI_HEALTH_TIMEOUT_SECONDS

    @property
    def configured(self) -> bool:
        return bool(self.base_url)

    async def health(self) -> Dict[str, Any]:
        if not self.configured:
            return {
                "available": False,
                "configured": False,
                "status": "unavailable",
                "message": "VOICE_AI_BASE_URL is not configured.",
            }

        try:
            async with httpx.AsyncClient(timeout=self.health_timeout) as client:
                response = await client.get(f"{self.base_url}/health")
                response.raise_for_status()
                payload = response.json() if response.content else {}
                return {
                    "available": True,
                    "configured": True,
                    "status": payload.get("status", "healthy"),
                    "raw": payload,
                }
        except Exception as exc:  # pragma: no cover - network variability
            return {
                "available": False,
                "configured": True,
                "status": "unreachable",
                "message": str(exc),
            }

    async def _post_json(self, path: str, payload: Dict[str, Any]) -> Dict[str, Any]:
        if not self.configured:
            raise VoiceAIUnavailableError("VOICE_AI_BASE_URL is not configured.")

        async with httpx.AsyncClient(timeout=self.timeout) as client:
            response = await client.post(f"{self.base_url}{path}", json=payload)
            response.raise_for_status()
            return response.json() if response.content else {}

    async def _post_files(
        self,
        path: str,
        *,
        files: Dict[str, tuple[str, bytes, str]],
        data: Optional[Dict[str, Any]] = None,
    ) -> Dict[str, Any]:
        if not self.configured:
            raise VoiceAIUnavailableError("VOICE_AI_BASE_URL is not configured.")

        async with httpx.AsyncClient(timeout=self.timeout) as client:
            response = await client.post(f"{self.base_url}{path}", files=files, data=data or {})
            response.raise_for_status()
            return response.json() if response.content else {}

    async def transcribe(
        self,
        *,
        filename: str,
        audio_bytes: bytes,
        content_type: str,
        prompt_text: str = "",
        question_text: str = "",
    ) -> Dict[str, Any]:
        payload = await self._post_files(
            "/transcribe",
            files={"file": (filename, audio_bytes, content_type)},
            data={"prompt_text": prompt_text, "question_text": question_text},
        )
        transcript = payload.get("transcript") or payload.get("text") or ""
        confidence = payload.get("confidence")
        return {
            "transcript": transcript,
            "confidence": confidence,
            "raw": payload,
        }

    async def score_transcript_confidence(
        self,
        *,
        transcript: str,
        prompt_text: str = "",
        question_text: str = "",
    ) -> Dict[str, Any]:
        return await self._post_json(
            "/score-transcript-confidence",
            {
                "transcript": transcript,
                "prompt_text": prompt_text,
                "question_text": question_text,
            },
        )

    async def enqueue_train_voice(self, payload: Dict[str, Any]) -> Dict[str, Any]:
        return await self._post_json("/enqueue-train-voice", payload)

    async def get_training_status(self, job_ref: str) -> Dict[str, Any]:
        if not self.configured:
            raise VoiceAIUnavailableError("VOICE_AI_BASE_URL is not configured.")

        async with httpx.AsyncClient(timeout=self.timeout) as client:
            response = await client.get(f"{self.base_url}/get-training-status", params={"job_ref": job_ref})
            response.raise_for_status()
            return response.json() if response.content else {}

    async def synthesize(self, payload: Dict[str, Any]) -> Dict[str, Any]:
        return await self._post_json("/synthesize", payload)


voice_ai_service = VoiceAIService()
