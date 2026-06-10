from __future__ import annotations

from typing import Any, Dict, List, Protocol


class VoiceProvider(Protocol):
    provider_id: str

    @property
    def configured(self) -> bool:
        ...

    async def health(self) -> Dict[str, Any]:
        ...

    async def transcribe(
        self,
        *,
        filename: str,
        audio_bytes: bytes,
        content_type: str,
        prompt_text: str = "",
        question_text: str = "",
    ) -> Dict[str, Any]:
        ...

    async def create_voice(self, *, name: str, samples: List[Dict[str, Any]]) -> Dict[str, Any]:
        ...

    async def synthesize(self, *, model_ref: str, text: str, voice_style_notes: str | None = None) -> Dict[str, Any]:
        ...
