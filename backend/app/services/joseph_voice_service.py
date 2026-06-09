from __future__ import annotations

import base64
import uuid
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Dict, Optional

from sqlalchemy import desc, func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.models.engram import Engram, VoiceProfile, VoiceSample, VoiceSynthSession, VoiceTrainingRun
from app.models.genealogy import FamilyNode
from app.services.voice_ai_service import VoiceAIUnavailableError, voice_ai_service


GUIDED_CAPTURE_SETS: Dict[str, list[str]] = {
    "consent_phrase": [
        "I consent to EverAfter storing my voice privately for my family and training a personal voice model.",
    ],
    "calibration": [
        "My name is __NAME__, and this recording is for my family voice profile.",
        "I am answering these questions in my own voice so my family can preserve how I sound.",
    ],
    "ocean_answer": [
        "Please answer the current personality question in your own words.",
        "Explain why the statement feels true or false for you.",
    ],
    "free_speech": [
        "Tell a short story about a family memory that matters to you.",
        "Describe a routine that helps you feel grounded or healthy.",
    ],
}

STRONG_AGREE_PHRASES = ("strongly agree", "absolutely", "definitely", "always", "completely", "without question")
AGREE_PHRASES = ("agree", "usually", "often", "mostly", "generally", "yes")
NEUTRAL_PHRASES = ("sometimes", "it depends", "neutral", "mixed", "not sure", "maybe")
DISAGREE_PHRASES = ("disagree", "rarely", "not really", "seldom", "usually not")
STRONG_DISAGREE_PHRASES = ("strongly disagree", "never", "absolutely not", "not at all", "no way")


class JosephVoiceService:
    def __init__(self) -> None:
        self.storage_root = Path(settings.JOSEPH_VOICE_STORAGE_DIR)

    def _iso(self, value: Optional[datetime]) -> Optional[str]:
        if not value:
            return None
        return value.isoformat()

    def _serialize_sample(self, sample: VoiceSample) -> Dict[str, Any]:
        return {
            "id": str(sample.id),
            "voice_profile_id": str(sample.voice_profile_id),
            "family_member_id": sample.family_member_id,
            "clip_type": sample.clip_type,
            "prompt_text": sample.prompt_text,
            "storage_path": sample.storage_path,
            "transcript": sample.transcript,
            "transcript_confidence": float(sample.transcript_confidence or 0.0),
            "duration_seconds": float(sample.duration_seconds or 0.0),
            "quality": sample.quality_json or {},
            "approved": bool(sample.approved),
            "review_status": sample.review_status,
            "derived_quiz_question_id": sample.derived_quiz_question_id,
            "consent_snapshot": sample.consent_snapshot_json or {},
            "created_at": self._iso(sample.created_at),
            "updated_at": self._iso(sample.updated_at),
        }

    def _serialize_profile(self, profile: VoiceProfile) -> Dict[str, Any]:
        approved_ready = (
            int(profile.sample_count or 0) >= settings.JOSEPH_VOICE_MIN_APPROVED_SAMPLES
            and float(profile.approved_seconds or 0.0) >= settings.JOSEPH_VOICE_MIN_APPROVED_SECONDS
        )
        return {
            "id": str(profile.id),
            "family_member_id": profile.family_member_id,
            "engram_id": profile.engram_id,
            "status": profile.status,
            "consent_status": profile.consent_status,
            "training_status": profile.training_status,
            "sample_count": int(profile.sample_count or 0),
            "approved_seconds": float(profile.approved_seconds or 0.0),
            "model_ref": profile.model_ref,
            "voice_style_notes": profile.voice_style_notes,
            "guided_sample_progress": profile.guided_sample_progress or {},
            "consent_snapshot": profile.consent_snapshot_json or {},
            "last_trained_at": self._iso(profile.last_trained_at),
            "created_at": self._iso(profile.created_at),
            "updated_at": self._iso(profile.updated_at),
            "training_ready": approved_ready and profile.consent_status == "opted_in",
        }

    async def _ensure_family_access(
        self,
        session: AsyncSession,
        owner_user_id: str,
        family_member_id: str,
    ) -> Optional[FamilyNode]:
        result = await session.execute(
            select(FamilyNode).where(
                FamilyNode.id == family_member_id,
                FamilyNode.user_id == owner_user_id,
            )
        )
        node = result.scalar_one_or_none()
        return node

    async def _get_profile(
        self,
        session: AsyncSession,
        owner_user_id: str,
        family_member_id: str,
    ) -> Optional[VoiceProfile]:
        result = await session.execute(
            select(VoiceProfile).where(
                VoiceProfile.owner_user_id == owner_user_id,
                VoiceProfile.family_member_id == family_member_id,
            )
        )
        return result.scalar_one_or_none()

    async def _refresh_profile_metrics(self, session: AsyncSession, profile: VoiceProfile) -> None:
        result = await session.execute(
            select(VoiceSample).where(VoiceSample.voice_profile_id == profile.id)
        )
        samples = result.scalars().all()
        approved_samples = [sample for sample in samples if sample.approved]
        progress: Dict[str, int] = {}
        for sample in approved_samples:
            progress[sample.clip_type] = progress.get(sample.clip_type, 0) + 1

        profile.sample_count = len(approved_samples)
        profile.approved_seconds = float(sum(sample.duration_seconds or 0.0 for sample in approved_samples))
        profile.guided_sample_progress = progress

        if profile.model_ref:
            profile.status = "ready"
            profile.training_status = "ready"
        elif profile.consent_status != "opted_in":
            profile.status = "pending_consent"
            profile.training_status = "collecting"
        elif (
            profile.sample_count >= settings.JOSEPH_VOICE_MIN_APPROVED_SAMPLES
            and profile.approved_seconds >= settings.JOSEPH_VOICE_MIN_APPROVED_SECONDS
        ):
            if profile.training_status not in {"training", "ready"}:
                profile.training_status = "ready_to_train"
            profile.status = "ready_to_train"
        else:
            profile.status = "collecting"
            if profile.training_status not in {"training", "ready"}:
                profile.training_status = "collecting"

    def _derive_likert(self, transcript: str) -> Dict[str, Any]:
        normalized = (transcript or "").strip().lower()
        if not normalized:
            return {"suggested_answer": None, "confidence": 0.0, "rationale": "No transcript available."}

        for phrase in STRONG_DISAGREE_PHRASES:
            if phrase in normalized:
                return {"suggested_answer": 1, "confidence": 0.93, "rationale": f"Matched strong-disagreement phrase: {phrase}."}
        for phrase in DISAGREE_PHRASES:
            if phrase in normalized:
                return {"suggested_answer": 2, "confidence": 0.8, "rationale": f"Matched disagreement phrase: {phrase}."}
        for phrase in NEUTRAL_PHRASES:
            if phrase in normalized:
                return {"suggested_answer": 3, "confidence": 0.68, "rationale": f"Matched neutral phrase: {phrase}."}
        for phrase in STRONG_AGREE_PHRASES:
            if phrase in normalized:
                return {"suggested_answer": 5, "confidence": 0.93, "rationale": f"Matched strong-agreement phrase: {phrase}."}
        for phrase in AGREE_PHRASES:
            if phrase in normalized:
                return {"suggested_answer": 4, "confidence": 0.8, "rationale": f"Matched agreement phrase: {phrase}."}

        if "not " in normalized or "don't" in normalized or "doesn't" in normalized:
            return {"suggested_answer": 2, "confidence": 0.58, "rationale": "Negative phrasing suggests disagreement."}

        return {"suggested_answer": 4, "confidence": 0.52, "rationale": "Defaulted to mild agreement because the response is affirmative but not explicit."}

    async def _save_audio_bytes(
        self,
        *,
        owner_user_id: str,
        family_member_id: str,
        clip_type: str,
        filename: str,
        audio_bytes: bytes,
    ) -> str:
        suffix = Path(filename or "voice.webm").suffix or ".webm"
        target_dir = self.storage_root / owner_user_id / family_member_id / clip_type
        target_dir.mkdir(parents=True, exist_ok=True)
        target_name = f"{datetime.now(timezone.utc).strftime('%Y%m%dT%H%M%S')}-{uuid.uuid4().hex}{suffix}"
        target_path = target_dir / target_name
        target_path.write_bytes(audio_bytes)
        return str(target_path)

    async def get_voice_health(self) -> Dict[str, Any]:
        health = await voice_ai_service.health()
        return {
            **health,
            "guided_capture_sets": GUIDED_CAPTURE_SETS,
            "thresholds": {
                "min_approved_samples": settings.JOSEPH_VOICE_MIN_APPROVED_SAMPLES,
                "min_approved_seconds": settings.JOSEPH_VOICE_MIN_APPROVED_SECONDS,
            },
        }

    async def create_or_update_profile(
        self,
        session: AsyncSession,
        *,
        owner_user_id: str,
        family_member_id: str,
        consent_granted: bool,
        consent_phrase: str = "",
        engram_id: Optional[str] = None,
        voice_style_notes: Optional[str] = None,
    ) -> Dict[str, Any]:
        member = await self._ensure_family_access(session, owner_user_id, family_member_id)
        profile = await self._get_profile(session, owner_user_id, family_member_id)
        if not profile:
            profile = VoiceProfile(
                owner_user_id=owner_user_id,
                family_member_id=family_member_id,
                engram_id=engram_id,
                voice_style_notes=voice_style_notes,
            )
            session.add(profile)

        if consent_granted:
            profile.consent_status = "opted_in"
            profile.consent_snapshot_json = {
                "consent_phrase": consent_phrase.strip(),
                "captured_at": datetime.now(timezone.utc).isoformat(),
                "family_member_name": member.name if member else family_member_id,
            }
        if engram_id:
            profile.engram_id = engram_id
        if voice_style_notes is not None:
            profile.voice_style_notes = voice_style_notes

        await self._refresh_profile_metrics(session, profile)
        await session.commit()
        await session.refresh(profile)
        sample_result = await session.execute(
            select(VoiceSample)
            .where(VoiceSample.voice_profile_id == profile.id)
            .order_by(desc(VoiceSample.created_at))
        )

        return {
            "profile": self._serialize_profile(profile),
            "samples": [self._serialize_sample(sample) for sample in sample_result.scalars().all()],
            "guided_capture_sets": GUIDED_CAPTURE_SETS,
            "sidecar": await voice_ai_service.health(),
        }

    async def get_profile_bundle(
        self,
        session: AsyncSession,
        *,
        owner_user_id: str,
        family_member_id: str,
    ) -> Dict[str, Any]:
        await self._ensure_family_access(session, owner_user_id, family_member_id)
        profile = await self._get_profile(session, owner_user_id, family_member_id)
        if not profile:
            return {
                "profile": None,
                "samples": [],
                "guided_capture_sets": GUIDED_CAPTURE_SETS,
                "sidecar": await voice_ai_service.health(),
            }

        await self._refresh_profile_metrics(session, profile)
        await session.commit()
        result = await session.execute(
            select(VoiceSample)
            .where(VoiceSample.voice_profile_id == profile.id)
            .order_by(desc(VoiceSample.created_at))
        )
        samples = [self._serialize_sample(sample) for sample in result.scalars().all()]
        return {
            "profile": self._serialize_profile(profile),
            "samples": samples,
            "guided_capture_sets": GUIDED_CAPTURE_SETS,
            "sidecar": await voice_ai_service.health(),
        }

    async def create_sample(
        self,
        session: AsyncSession,
        *,
        owner_user_id: str,
        family_member_id: str,
        clip_type: str,
        filename: str,
        audio_bytes: bytes,
        content_type: str,
        prompt_text: str = "",
        duration_seconds: float = 0.0,
        approved: bool = False,
        consent_granted: bool = False,
        consent_phrase: str = "",
        engram_id: Optional[str] = None,
        derived_quiz_question_id: Optional[str] = None,
        transcribe: bool = False,
    ) -> Dict[str, Any]:
        await self._ensure_family_access(session, owner_user_id, family_member_id)
        profile = await self._get_profile(session, owner_user_id, family_member_id)
        if not profile:
            if not consent_granted:
                raise ValueError("Explicit voice consent is required before collecting samples.")
            await self.create_or_update_profile(
                session,
                owner_user_id=owner_user_id,
                family_member_id=family_member_id,
                consent_granted=True,
                consent_phrase=consent_phrase,
                engram_id=engram_id,
            )
            profile = await self._get_profile(session, owner_user_id, family_member_id)
        elif profile.consent_status != "opted_in" and not consent_granted:
            raise ValueError("Explicit voice consent is required before collecting samples.")

        if consent_granted and profile and profile.consent_status != "opted_in":
            profile.consent_status = "opted_in"
            profile.consent_snapshot_json = {
                "consent_phrase": consent_phrase.strip(),
                "captured_at": datetime.now(timezone.utc).isoformat(),
            }
        if engram_id:
            profile.engram_id = engram_id

        storage_path = await self._save_audio_bytes(
            owner_user_id=owner_user_id,
            family_member_id=family_member_id,
            clip_type=clip_type,
            filename=filename,
            audio_bytes=audio_bytes,
        )

        transcript = ""
        transcript_confidence = 0.0
        transcription_raw: Dict[str, Any] | None = None

        if transcribe:
            if not voice_ai_service.configured:
                raise VoiceAIUnavailableError("Voice sidecar is not configured.")
            transcription = await voice_ai_service.transcribe(
                filename=filename,
                audio_bytes=audio_bytes,
                content_type=content_type or "audio/webm",
                prompt_text=prompt_text,
                question_text=prompt_text,
            )
            transcript = (transcription.get("transcript") or "").strip()
            transcript_confidence = float(transcription.get("confidence") or 0.0)
            transcription_raw = transcription.get("raw") or {}

        sample = VoiceSample(
            voice_profile_id=profile.id,
            owner_user_id=owner_user_id,
            family_member_id=family_member_id,
            clip_type=clip_type,
            prompt_text=prompt_text,
            storage_path=storage_path,
            transcript=transcript,
            transcript_confidence=transcript_confidence,
            duration_seconds=max(float(duration_seconds or 0.0), 0.0),
            quality_json={
                "byte_length": len(audio_bytes),
                "content_type": content_type,
                "captured_via": "joseph_voice",
            },
            approved=approved,
            review_status="approved" if approved else "pending_review",
            derived_quiz_question_id=derived_quiz_question_id,
            consent_snapshot_json=profile.consent_snapshot_json or {},
        )
        session.add(sample)
        await session.flush()

        await self._refresh_profile_metrics(session, profile)
        await session.commit()
        await session.refresh(profile)
        await session.refresh(sample)

        return {
            "profile": self._serialize_profile(profile),
            "sample": self._serialize_sample(sample),
            "transcription": transcription_raw,
        }

    async def submit_voice_quiz_answer(
        self,
        session: AsyncSession,
        *,
        owner_user_id: str,
        family_member_id: str,
        question_id: str,
        question_text: str,
        filename: str,
        audio_bytes: bytes,
        content_type: str,
        duration_seconds: float,
    ) -> Dict[str, Any]:
        sample_payload = await self.create_sample(
            session,
            owner_user_id=owner_user_id,
            family_member_id=family_member_id,
            clip_type="ocean_answer",
            filename=filename,
            audio_bytes=audio_bytes,
            content_type=content_type,
            prompt_text=question_text,
            duration_seconds=duration_seconds,
            approved=False,
            derived_quiz_question_id=question_id,
            transcribe=True,
        )
        transcript = sample_payload["sample"].get("transcript") or ""
        suggestion = self._derive_likert(transcript)
        sidecar_confidence = float(sample_payload["sample"].get("transcript_confidence") or 0.0)
        suggestion["confidence"] = round(max(suggestion["confidence"], sidecar_confidence), 3)
        return {
            **sample_payload,
            "question_id": question_id,
            "question_text": question_text,
            "suggested_answer": suggestion["suggested_answer"],
            "answer_confidence": suggestion["confidence"],
            "rationale": suggestion["rationale"],
            "requires_review": True,
        }

    async def approve_voice_quiz_answer(
        self,
        session: AsyncSession,
        *,
        owner_user_id: str,
        sample_id: str,
        selected_answer: int,
        transcript: str,
    ) -> Dict[str, Any]:
        result = await session.execute(
            select(VoiceSample, VoiceProfile)
            .join(VoiceProfile, VoiceProfile.id == VoiceSample.voice_profile_id)
            .where(
                VoiceSample.id == sample_id,
                VoiceSample.owner_user_id == owner_user_id,
            )
        )
        row = result.first()
        if not row:
            raise ValueError("Voice sample not found.")

        sample, profile = row
        sample.transcript = transcript.strip()
        sample.approved = True
        sample.review_status = "approved"

        confidence_payload = {"confidence": sample.transcript_confidence}
        if sample.transcript and voice_ai_service.configured:
            try:
                confidence_payload = await voice_ai_service.score_transcript_confidence(
                    transcript=sample.transcript,
                    prompt_text=sample.prompt_text or "",
                    question_text=sample.prompt_text or "",
                )
            except Exception:
                confidence_payload = {"confidence": sample.transcript_confidence}
        sample.transcript_confidence = float(confidence_payload.get("confidence") or sample.transcript_confidence or 0.0)

        await self._refresh_profile_metrics(session, profile)
        await session.commit()
        await session.refresh(profile)
        await session.refresh(sample)

        return {
            "profile": self._serialize_profile(profile),
            "sample": self._serialize_sample(sample),
            "approved_answer": int(selected_answer),
        }

    async def start_training(
        self,
        session: AsyncSession,
        *,
        owner_user_id: str,
        family_member_id: str,
        engram_id: Optional[str] = None,
        voice_style_notes: Optional[str] = None,
    ) -> Dict[str, Any]:
        profile = await self._get_profile(session, owner_user_id, family_member_id)
        if not profile:
            raise ValueError("Voice profile not found.")
        await self._ensure_family_access(session, owner_user_id, family_member_id)
        await self._refresh_profile_metrics(session, profile)

        if profile.consent_status != "opted_in":
            raise ValueError("Explicit voice consent is required before training.")
        if profile.sample_count < settings.JOSEPH_VOICE_MIN_APPROVED_SAMPLES:
            raise ValueError("Not enough approved samples to train this voice model yet.")
        if profile.approved_seconds < settings.JOSEPH_VOICE_MIN_APPROVED_SECONDS:
            raise ValueError("Not enough approved audio duration to train this voice model yet.")
        if not voice_ai_service.configured:
            raise VoiceAIUnavailableError("Voice sidecar is not configured.")

        if engram_id:
            eng_result = await session.execute(select(Engram).where(Engram.id == engram_id))
            if eng_result.scalar_one_or_none() is None:
                raise ValueError("Engram not found for voice linkage.")
            profile.engram_id = engram_id
        if voice_style_notes is not None:
            profile.voice_style_notes = voice_style_notes

        sample_result = await session.execute(
            select(VoiceSample).where(
                VoiceSample.voice_profile_id == profile.id,
                VoiceSample.approved.is_(True),
            )
        )
        approved_samples = sample_result.scalars().all()
        payload = {
            "voice_profile_id": str(profile.id),
            "family_member_id": family_member_id,
            "engram_id": profile.engram_id,
            "voice_style_notes": profile.voice_style_notes,
            "samples": [
                {
                    "sample_id": str(sample.id),
                    "storage_path": sample.storage_path,
                    "clip_type": sample.clip_type,
                    "transcript": sample.transcript,
                    "duration_seconds": sample.duration_seconds,
                    "content_type": (sample.quality_json or {}).get("content_type") or "audio/webm",
                    "audio_base64": base64.b64encode(Path(sample.storage_path).read_bytes()).decode("ascii"),
                }
                for sample in approved_samples
            ],
        }

        sidecar_response = await voice_ai_service.enqueue_train_voice(payload)
        run = VoiceTrainingRun(
            voice_profile_id=profile.id,
            owner_user_id=owner_user_id,
            status=sidecar_response.get("status", "queued"),
            sample_count=profile.sample_count,
            approved_seconds=profile.approved_seconds,
            sidecar_job_ref=sidecar_response.get("job_ref"),
            request_payload=payload,
            result_json=sidecar_response,
        )
        session.add(run)
        profile.training_status = "training"
        profile.status = "training"
        await session.commit()
        await session.refresh(profile)
        await session.refresh(run)

        return {
            "profile": self._serialize_profile(profile),
            "training_run": {
                "id": str(run.id),
                "status": run.status,
                "job_ref": run.sidecar_job_ref,
                "sample_count": run.sample_count,
                "approved_seconds": run.approved_seconds,
                "created_at": self._iso(run.created_at),
            },
        }

    async def get_training_status(
        self,
        session: AsyncSession,
        *,
        owner_user_id: str,
        family_member_id: str,
    ) -> Dict[str, Any]:
        profile = await self._get_profile(session, owner_user_id, family_member_id)
        if not profile:
            raise ValueError("Voice profile not found.")

        run_result = await session.execute(
            select(VoiceTrainingRun)
            .where(VoiceTrainingRun.voice_profile_id == profile.id)
            .order_by(desc(VoiceTrainingRun.created_at))
        )
        run = run_result.scalars().first()
        sidecar_status: Dict[str, Any] | None = None

        if run and run.sidecar_job_ref and voice_ai_service.configured:
            try:
                sidecar_status = await voice_ai_service.get_training_status(run.sidecar_job_ref)
                run.result_json = sidecar_status
                run.status = sidecar_status.get("status", run.status)
                model_ref = sidecar_status.get("model_ref")
                if model_ref:
                    profile.model_ref = model_ref
                    profile.training_status = "ready"
                    profile.status = "ready"
                    profile.last_trained_at = datetime.now(timezone.utc)
                elif run.status in {"failed", "error"}:
                    profile.training_status = "failed"
                    profile.status = "collecting"
            except Exception as exc:
                sidecar_status = {"status": "unreachable", "message": str(exc)}

        await self._refresh_profile_metrics(session, profile)
        await session.commit()
        await session.refresh(profile)

        return {
            "profile": self._serialize_profile(profile),
            "training_run": None
            if not run
            else {
                "id": str(run.id),
                "status": run.status,
                "job_ref": run.sidecar_job_ref,
                "result": run.result_json or {},
                "error_text": run.error_text,
                "created_at": self._iso(run.created_at),
                "updated_at": self._iso(run.updated_at),
            },
            "sidecar_status": sidecar_status,
        }

    async def synthesize(
        self,
        session: AsyncSession,
        *,
        owner_user_id: str,
        family_member_id: str,
        engram_id: str,
        text_content: str,
    ) -> Dict[str, Any]:
        profile = await self._get_profile(session, owner_user_id, family_member_id)
        if not profile:
            raise ValueError("Voice profile not found.")
        if profile.consent_status != "opted_in":
            raise ValueError("Voice playback requires explicit consent.")
        if not profile.model_ref:
            raise ValueError("Voice model is not ready yet.")
        if profile.engram_id and profile.engram_id != engram_id:
            raise ValueError("This voice profile is linked to a different Engram.")
        if not voice_ai_service.configured:
            raise VoiceAIUnavailableError("Voice sidecar is not configured.")

        eng_result = await session.execute(select(Engram).where(Engram.id == engram_id))
        if eng_result.scalar_one_or_none() is None:
            raise ValueError("Engram not found.")

        payload = {
            "model_ref": profile.model_ref,
            "text": text_content,
            "voice_style_notes": profile.voice_style_notes,
            "engram_id": engram_id,
        }
        synth = VoiceSynthSession(
            voice_profile_id=profile.id,
            owner_user_id=owner_user_id,
            family_member_id=family_member_id,
            engram_id=engram_id,
            text_content=text_content,
            status="pending",
            sidecar_request_json=payload,
        )
        session.add(synth)
        await session.flush()

        result = await voice_ai_service.synthesize(payload)
        synth.status = result.get("status", "completed")
        synth.result_json = result
        synth.output_ref = result.get("output_ref") or result.get("audio_url")
        await session.commit()
        await session.refresh(synth)

        return {
            "session_id": str(synth.id),
            "status": synth.status,
            "output_ref": synth.output_ref,
            "result": synth.result_json or {},
        }


joseph_voice_service = JosephVoiceService()
