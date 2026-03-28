from __future__ import annotations

import uuid
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional

from fastapi import FastAPI, File, Form, HTTPException, Query, UploadFile
from pydantic import BaseModel

from app.config import settings
from app.providers import get_provider
from app.storage import job_store


provider = get_provider()
app = FastAPI(title="EverAfter Voice AI Service")


class TranscriptConfidenceRequest(BaseModel):
    transcript: str
    prompt_text: str = ""
    question_text: str = ""


class TrainVoiceRequest(BaseModel):
    voice_profile_id: str
    family_member_id: str
    engram_id: Optional[str] = None
    voice_style_notes: Optional[str] = None
    samples: List[Dict[str, Any]]


class SynthesizeRequest(BaseModel):
    model_ref: str
    text: str
    voice_style_notes: Optional[str] = None
    engram_id: Optional[str] = None


def _utc_now() -> str:
    return datetime.now(timezone.utc).isoformat()


@app.get("/health")
async def health():
    provider_health = await provider.health()
    return {
        "status": provider_health.get("status", "unavailable"),
        "provider": provider.provider_id,
        "configured": provider.configured,
        "message": provider_health.get("message"),
        "provider_health": provider_health,
        "operations": {
            "transcribe": provider.configured,
            "train": provider.configured,
            "synthesize": provider.configured,
        },
    }


@app.post("/transcribe")
async def transcribe(
    file: UploadFile = File(...),
    prompt_text: str = Form(""),
    question_text: str = Form(""),
):
    try:
        audio_bytes = await file.read()
        return await provider.transcribe(
            filename=file.filename or "voice.webm",
            audio_bytes=audio_bytes,
            content_type=file.content_type or "audio/webm",
            prompt_text=prompt_text,
            question_text=question_text,
        )
    except Exception as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from exc


@app.post("/score-transcript-confidence")
async def score_transcript_confidence(payload: TranscriptConfidenceRequest):
    transcript = payload.transcript.strip()
    if not transcript:
        return {"confidence": 0.0}

    confidence = 0.55
    if len(transcript.split()) >= 8:
        confidence += 0.15
    if payload.prompt_text and any(word in transcript.lower() for word in payload.prompt_text.lower().split()[:4]):
        confidence += 0.1
    if payload.question_text and any(word in transcript.lower() for word in payload.question_text.lower().split()[:4]):
        confidence += 0.1

    return {"confidence": min(confidence, 0.98)}


@app.post("/enqueue-train-voice")
async def enqueue_train_voice(payload: TrainVoiceRequest):
    job_ref = uuid.uuid4().hex
    try:
        result = await provider.create_voice(
            name=f"EverAfter {payload.family_member_id}",
            samples=payload.samples,
        )
        job_payload = {
            "job_ref": job_ref,
            "status": result.get("status", "ready"),
            "model_ref": result.get("model_ref"),
            "provider": provider.provider_id,
            "created_at": _utc_now(),
            "result": result,
        }
        job_store.save(job_ref, job_payload)
        return job_payload
    except Exception as exc:
        job_payload = {
            "job_ref": job_ref,
            "status": "failed",
            "provider": provider.provider_id,
            "created_at": _utc_now(),
            "message": str(exc),
        }
        job_store.save(job_ref, job_payload)
        raise HTTPException(status_code=503, detail=str(exc)) from exc


@app.get("/get-training-status")
async def get_training_status(job_ref: str = Query(...)):
    payload = job_store.load(job_ref)
    if not payload:
        raise HTTPException(status_code=404, detail="Training job not found.")
    return payload


@app.post("/synthesize")
async def synthesize(payload: SynthesizeRequest):
    try:
        return await provider.synthesize(
            model_ref=payload.model_ref,
            text=payload.text,
            voice_style_notes=payload.voice_style_notes,
        )
    except Exception as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from exc


@app.get("/")
async def root():
    return {
        "message": "EverAfter Voice AI Service",
        "health": "/health",
        "provider": settings.VOICE_AI_PROVIDER,
    }
