"""Unit tests for St. Raphael's medical-safety guardrails
(app/services/health/medical_safety.py). Pure-stdlib module: runs without
the web stack installed."""
import os
import sys

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from app.services.health.medical_safety import (  # noqa: E402
    DIAGNOSIS_DISCLAIMER,
    EMERGENCY_PREFACE,
    RAPHAEL_SAFETY_PROMPT,
    SAFE_REFUSAL,
    apply_output_safety,
    detect_emergency,
)


# ── Output filter: prescriptive dosing is replaced wholesale ─────────────

def test_dosing_mg_instruction_blocked():
    text, flags = apply_output_safety(
        "Based on your symptoms, take 500 mg of ibuprofen every 6 hours."
    )
    assert text == SAFE_REFUSAL
    assert flags == ["prescriptive_dosing_blocked"]


def test_dosing_tablet_count_blocked():
    text, flags = apply_output_safety(
        "You should feel better if you take two tablets before bed tonight."
    )
    assert text == SAFE_REFUSAL
    assert "prescriptive_dosing_blocked" in flags


def test_stop_taking_medication_blocked():
    text, flags = apply_output_safety(
        "Given the side effects you described, stop taking your metformin for now."
    )
    assert text == SAFE_REFUSAL
    assert "prescriptive_dosing_blocked" in flags


def test_adjust_insulin_blocked():
    text, flags = apply_output_safety(
        "Your readings look high, so increase your insulin dose slightly."
    )
    assert text == SAFE_REFUSAL
    assert "prescriptive_dosing_blocked" in flags


# ── Output filter: diagnostic claims get a prominent correction ──────────

def test_diagnostic_claim_disclaimed():
    original = "Looking at these symptoms, you probably have diabetes."
    text, flags = apply_output_safety(original)
    assert text.startswith(original)
    assert text.endswith(DIAGNOSIS_DISCLAIMER)
    assert flags == ["diagnostic_claim_disclaimed"]


def test_explicit_diagnosis_language_disclaimed():
    text, flags = apply_output_safety(
        "My diagnosis here is straightforward: this is anxiety."
    )
    assert text.endswith(DIAGNOSIS_DISCLAIMER)
    assert "diagnostic_claim_disclaimed" in flags


# ── Output filter: safe content passes through untouched ─────────────────

def test_safe_wellness_content_untouched():
    original = (
        "Your average sleep this week was 7.2 hours, up from 6.8 last week — "
        "a lovely trend. Keeping a consistent wind-down time is one of the "
        "best-evidenced ways to protect it. It may be worth mentioning the "
        "morning headaches to your doctor at your next visit."
    )
    text, flags = apply_output_safety(original)
    assert text == original
    assert flags == []


def test_recommending_seeing_doctor_is_not_blocked():
    original = (
        "I can't tell you what's causing this — please book an appointment "
        "with your clinician, and bring your symptom log along."
    )
    text, flags = apply_output_safety(original)
    assert text == original
    assert flags == []


# ── Emergency detection on the user message ──────────────────────────────

def test_chest_pain_triggers_emergency_preface():
    assert detect_emergency("I've had chest pain since this morning") == EMERGENCY_PREFACE


def test_suicidal_language_triggers_emergency_preface():
    assert detect_emergency("honestly I don't want to be alive anymore") == EMERGENCY_PREFACE


def test_overdose_triggers_emergency_preface():
    assert detect_emergency("I think I took too many of my sleeping pills") == EMERGENCY_PREFACE


def test_normal_message_no_emergency():
    assert detect_emergency("how did my sleep look this week?") is None


# ── Prompt constraints exist and say the right things ────────────────────

def test_safety_prompt_covers_core_boundaries():
    lowered = RAPHAEL_SAFETY_PROMPT.lower()
    assert "never" in lowered and "diagnose" in lowered
    assert "prescribe" in lowered
    assert "911" in RAPHAEL_SAFETY_PROMPT
    assert "988" in RAPHAEL_SAFETY_PROMPT


if __name__ == "__main__":
    failures = 0
    for name, fn in sorted(globals().items()):
        if name.startswith("test_") and callable(fn):
            try:
                fn()
                print(f"PASS  {name}")
            except AssertionError as exc:
                failures += 1
                print(f"FAIL  {name}: {exc}")
    raise SystemExit(1 if failures else 0)
