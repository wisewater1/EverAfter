from types import SimpleNamespace

import pytest

from app.services.joseph_voice_service import JosephVoiceService


class _FirstResult:
    def __init__(self, value):
        self._value = value

    def first(self):
        return self._value


class _ScalarCollection:
    def __init__(self, items):
        self._items = items

    def all(self):
        return list(self._items)


class _ScalarResult:
    def __init__(self, items):
        self._items = items

    def scalars(self):
        return _ScalarCollection(self._items)


class _FakeSession:
    def __init__(self, execute_results=None):
        self.execute_results = list(execute_results or [])
        self.added = []

    def add(self, item):
        self.added.append(item)

    async def flush(self):
        return None

    async def commit(self):
        return None

    async def refresh(self, _item):
        return None

    async def execute(self, _query):
        if not self.execute_results:
            raise AssertionError("Unexpected execute call")
        return self.execute_results.pop(0)


@pytest.mark.asyncio
async def test_create_voice_profile_with_explicit_consent(monkeypatch):
    service = JosephVoiceService()
    session = _FakeSession(execute_results=[_ScalarResult([])])

    async def fake_member_access(_session, _owner_user_id, _family_member_id):
        return SimpleNamespace(name="Alice Example")

    async def fake_get_profile(_session, _owner_user_id, _family_member_id):
        return None

    async def fake_refresh(_session, profile):
        profile.status = "collecting"
        profile.training_status = "collecting"
        profile.sample_count = 0
        profile.approved_seconds = 0.0
        profile.guided_sample_progress = {}

    async def fake_health():
        return {"available": False, "configured": False, "status": "offline"}

    monkeypatch.setattr(service, "_ensure_family_access", fake_member_access)
    monkeypatch.setattr(service, "_get_profile", fake_get_profile)
    monkeypatch.setattr(service, "_refresh_profile_metrics", fake_refresh)
    monkeypatch.setattr("app.services.joseph_voice_service.voice_ai_service.health", fake_health)

    result = await service.create_or_update_profile(
        session,
        owner_user_id="user-1",
        family_member_id="member-1",
        consent_granted=True,
        consent_phrase="I consent to private family voice storage.",
        engram_id="engram-1",
        voice_style_notes="Warm, steady, and direct.",
    )

    assert result["profile"]["family_member_id"] == "member-1"
    assert result["profile"]["consent_status"] == "opted_in"
    assert result["profile"]["engram_id"] == "engram-1"
    assert result["profile"]["training_ready"] is False


@pytest.mark.asyncio
async def test_start_training_rejects_without_explicit_consent(monkeypatch):
    service = JosephVoiceService()
    session = _FakeSession()
    profile = SimpleNamespace(
        consent_status="pending_consent",
        sample_count=12,
        approved_seconds=120.0,
        engram_id=None,
        voice_style_notes=None,
        training_status="collecting",
        status="collecting",
        model_ref=None,
    )

    async def fake_get_profile(_session, _owner_user_id, _family_member_id):
        return profile

    async def fake_member_access(*_args, **_kwargs):
        return None

    async def fake_refresh(*_args, **_kwargs):
        return None

    monkeypatch.setattr(service, "_get_profile", fake_get_profile)
    monkeypatch.setattr(service, "_ensure_family_access", fake_member_access)
    monkeypatch.setattr(service, "_refresh_profile_metrics", fake_refresh)

    with pytest.raises(ValueError, match="consent"):
        await service.start_training(
            session,
            owner_user_id="user-1",
            family_member_id="member-1",
        )


@pytest.mark.asyncio
async def test_start_training_rejects_when_approved_samples_are_below_threshold(monkeypatch):
    service = JosephVoiceService()
    session = _FakeSession()
    profile = SimpleNamespace(
        consent_status="opted_in",
        sample_count=1,
        approved_seconds=10.0,
        engram_id=None,
        voice_style_notes=None,
        training_status="collecting",
        status="collecting",
        model_ref=None,
    )

    async def fake_get_profile(_session, _owner_user_id, _family_member_id):
        return profile

    async def fake_member_access(*_args, **_kwargs):
        return None

    async def fake_refresh(*_args, **_kwargs):
        return None

    monkeypatch.setattr(service, "_get_profile", fake_get_profile)
    monkeypatch.setattr(service, "_ensure_family_access", fake_member_access)
    monkeypatch.setattr(service, "_refresh_profile_metrics", fake_refresh)

    with pytest.raises(ValueError, match="Not enough approved samples"):
        await service.start_training(
            session,
            owner_user_id="user-1",
            family_member_id="member-1",
        )


@pytest.mark.asyncio
async def test_submit_voice_quiz_answer_returns_suggested_likert(monkeypatch):
    service = JosephVoiceService()

    async def fake_create_sample(*_args, **_kwargs):
        return {
            "profile": {"id": "profile-1"},
            "sample": {
                "id": "sample-1",
                "transcript": "I strongly agree with this statement because it matches me exactly.",
                "transcript_confidence": 0.61,
            },
        }

    monkeypatch.setattr(service, "create_sample", fake_create_sample)

    result = await service.submit_voice_quiz_answer(
        object(),
        owner_user_id="user-1",
        family_member_id="member-1",
        question_id="q-1",
        question_text="I am organized and reliable.",
        filename="answer.webm",
        audio_bytes=b"voice",
        content_type="audio/webm",
        duration_seconds=8.0,
    )

    assert result["sample"]["id"] == "sample-1"
    assert result["suggested_answer"] == 5
    assert result["requires_review"] is True
    assert result["answer_confidence"] >= 0.9


@pytest.mark.asyncio
async def test_create_sample_rejects_without_explicit_consent(monkeypatch):
    service = JosephVoiceService()
    session = _FakeSession()
    profile = SimpleNamespace(
        id="profile-1",
        consent_status="pending",
    )

    async def fake_member_access(*_args, **_kwargs):
        return None

    async def fake_get_profile(*_args, **_kwargs):
        return profile

    monkeypatch.setattr(service, "_ensure_family_access", fake_member_access)
    monkeypatch.setattr(service, "_get_profile", fake_get_profile)

    with pytest.raises(ValueError, match="Explicit voice consent"):
        await service.create_sample(
            session,
            owner_user_id="user-1",
            family_member_id="member-1",
            clip_type="calibration",
            filename="sample.webm",
            audio_bytes=b"voice-bytes",
            content_type="audio/webm",
        )


@pytest.mark.asyncio
async def test_approve_voice_quiz_answer_marks_sample_as_approved(monkeypatch):
    service = JosephVoiceService()
    sample = SimpleNamespace(
        id="sample-1",
        voice_profile_id="profile-1",
        owner_user_id="user-1",
        family_member_id="member-1",
        clip_type="ocean_answer",
        prompt_text="I am calm under pressure.",
        storage_path="voice/sample-1.webm",
        transcript=None,
        transcript_confidence=0.25,
        duration_seconds=7.0,
        quality_json={},
        approved=False,
        review_status="pending_review",
        derived_quiz_question_id="q-1",
        consent_snapshot_json={},
        created_at=None,
        updated_at=None,
    )
    profile = SimpleNamespace(
        id="profile-1",
        family_member_id="member-1",
        engram_id=None,
        status="collecting",
        consent_status="opted_in",
        training_status="collecting",
        sample_count=0,
        approved_seconds=0.0,
        model_ref=None,
        voice_style_notes=None,
        guided_sample_progress={},
        consent_snapshot_json={},
        last_trained_at=None,
        created_at=None,
        updated_at=None,
    )
    session = _FakeSession(execute_results=[_FirstResult((sample, profile))])

    async def fake_refresh(_session, refreshed_profile):
        refreshed_profile.sample_count = 1
        refreshed_profile.approved_seconds = 7.0

    monkeypatch.setattr(service, "_refresh_profile_metrics", fake_refresh)
    monkeypatch.setattr(
        "app.services.joseph_voice_service.voice_ai_service",
        SimpleNamespace(configured=False),
        raising=False,
    )

    result = await service.approve_voice_quiz_answer(
        session,
        owner_user_id="user-1",
        sample_id="sample-1",
        selected_answer=4,
        transcript="I agree most of the time.",
    )

    assert sample.approved is True
    assert sample.review_status == "approved"
    assert result["approved_answer"] == 4
    assert result["profile"]["sample_count"] == 1
