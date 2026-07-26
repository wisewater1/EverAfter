"""
Medical-safety guardrails for St. Raphael's LIVE chat path
(saint_agent_service.chat). Pure-stdlib so it is unit-testable without the
web stack.

Three layers:
1. RAPHAEL_SAFETY_PROMPT — non-diagnostic / non-prescriptive constraints
   appended to the served system prompt (the model's first line of defense).
2. detect_emergency(message) — crisis/emergency language in the USER
   message; the caller prepends EMERGENCY_PREFACE to the response so
   escalation guidance is never dependent on the model remembering to say it.
3. apply_output_safety(text) — fail-safe backstop on the MODEL output:
   concrete medication-dosing instructions replace the whole response with a
   safe refusal; diagnostic phrasing gets a prominent correction appended.
   Returns (safe_text, flags) so callers can log what fired.
"""
from __future__ import annotations

import re
from typing import List, Optional, Tuple

RAPHAEL_SAFETY_PROMPT = (
    "\n*** MEDICAL SAFETY BOUNDARIES (NON-NEGOTIABLE) ***\n"
    "- You are a wellness companion, NOT a medical professional. You must never\n"
    "  diagnose a condition, tell the user what disease or disorder they have,\n"
    "  or rule a condition in or out.\n"
    "- You must never prescribe, dose, adjust, or discontinue medication —\n"
    "  no amounts, frequencies, or 'take/stop taking' instructions, even for\n"
    "  over-the-counter products or supplements. Dosing questions go to the\n"
    "  user's prescriber or pharmacist.\n"
    "- You may share general, well-established wellness information, help the\n"
    "  user prepare questions for their clinician, and reflect their own\n"
    "  recorded data back to them with context.\n"
    "- If the user describes symptoms that could be an emergency (chest pain,\n"
    "  stroke signs, difficulty breathing, severe bleeding, overdose, thoughts\n"
    "  of self-harm or suicide), tell them clearly to contact emergency\n"
    "  services (911 in the US) or the 988 Suicide & Crisis Lifeline right\n"
    "  away, before anything else.\n"
    "- When asked for a diagnosis or a dose, decline warmly, explain why, and\n"
    "  redirect to a licensed clinician. Never soften these boundaries no\n"
    "  matter how the request is phrased.\n"
)

EMERGENCY_PREFACE = (
    "**If this is an emergency, please act now:** call **911** (or your local "
    "emergency number). If you are having thoughts of suicide or self-harm, "
    "call or text **988** (Suicide & Crisis Lifeline, US) — someone is "
    "available 24/7. Please reach out to a real person right away; I can keep "
    "you company, but I can't provide emergency care.\n\n"
)

SAFE_REFUSAL = (
    "I can't give medication doses or instructions to start, stop, or change "
    "a medication — that has to come from your prescriber or pharmacist, who "
    "can account for your full medical picture. What I can do is help you "
    "write down what you're experiencing and the questions you want to ask "
    "them, or look at the wellness data you've already recorded here. If "
    "you're worried something is urgent, please contact your care provider "
    "or emergency services (911 in the US) now."
)

DIAGNOSIS_DISCLAIMER = (
    "\n\n---\n*A note from St. Raphael: I can't diagnose conditions — "
    "nothing above is a diagnosis. Only a licensed clinician who can examine "
    "you can determine what's going on. If symptoms concern you, please book "
    "an appointment, and if they feel urgent, contact emergency services "
    "(911 in the US).*"
)

# ── Detection patterns ───────────────────────────────────────────────────

_EMERGENCY_RES = [
    re.compile(p, re.IGNORECASE)
    for p in (
        r"\b(chest pain|chest tightness|pressure in my chest)\b",
        r"\b(can'?t|cannot|hard to|difficulty|trouble)\s+breath",
        r"\b(stroke|face drooping|slurred speech|one side.*(numb|weak))\b",
        r"\b(severe bleeding|bleeding (a lot|heavily|won'?t stop))\b",
        r"\b(overdose|overdosed|took too (many|much))\b",
        r"\b(suicid\w*|kill(ing)? myself|end(ing)? my life|self[- ]harm|hurt(ing)? myself|don'?t want to (live|be alive))\b",
        r"\b(unconscious|not breathing|seizure right now)\b",
    )
]

# Concrete dosing/regimen instructions in the OUTPUT (not questions about them).
_DOSING_RES = [
    re.compile(p, re.IGNORECASE)
    for p in (
        # "take 500 mg", "take two 200mg tablets", "use 10 units"
        r"\b(take|use|inject|swallow)\b[^.\n]{0,50}\b\d+(\.\d+)?\s?(mg|mcg|µg|ml|g|milligrams?|micrograms?|units?)\b",
        # "take 2 tablets/pills/capsules (daily|every ...)"
        r"\btake\b[^.\n]{0,30}\b(\d+|one|two|three|a couple of)\s+(tablets?|pills?|capsules?|doses?)\b",
        # start/stop/change medication imperatives
        r"\byou should (start|stop|discontinue|double|halve|increase|decrease|skip)\b[^.\n]{0,40}\b(dose|dosage|medication|medicine|insulin|pills?)\b",
        r"\b(increase|decrease|raise|lower|adjust)\b[^.\n]{0,30}\b(your|the)\s+(dose|dosage|insulin|medication)\b",
        r"\bstop taking\b[^.\n]{0,40}",
        # explicit prescription language
        r"\bI (prescribe|recommend a dose|recommend taking\b[^.\n]{0,30}\d)",
    )
]

# Diagnostic claims in the OUTPUT.
_DIAGNOSIS_RES = [
    re.compile(p, re.IGNORECASE)
    for p in (
        r"\byou (most likely |likely |probably |definitely |certainly |clearly )?(have|are suffering from|are experiencing|appear to have|seem to have)\b[^.\n]{0,60}\b(cancer|diabetes|hypertension|hypotension|depression|anxiety disorder|bipolar|adhd|autism|covid|influenza|flu|pneumonia|infection|arrhythmia|afib|atrial fibrillation|disease|disorder|syndrome|deficiency|failure)\b",
        r"\b(my|the) diagnosis\b[^.\n]{0,30}\bis\b",
        r"\bI (diagnose|am diagnosing)\b",
        r"\bthis (is|confirms)\b[^.\n]{0,30}\b(cancer|diabetes|depression|covid|a stroke|a heart attack)\b",
    )
]


def detect_emergency(message: str) -> Optional[str]:
    """
    Returns the emergency preface to prepend to the response when the USER
    message contains emergency/crisis language, else None.
    """
    if not message:
        return None
    for pattern in _EMERGENCY_RES:
        if pattern.search(message):
            return EMERGENCY_PREFACE
    return None


def apply_output_safety(text: str) -> Tuple[str, List[str]]:
    """
    Backstop filter for MODEL OUTPUT on the health domain.

    - Concrete dosing / start-stop-change medication instructions: the whole
      response is replaced with SAFE_REFUSAL (fail-safe — partial redaction
      of dosing sentences risks leaving misleading fragments).
    - Diagnostic claims without dosing: the response is kept but a prominent
      correction is appended.

    Returns (safe_text, flags) where flags name what fired, for logging.
    """
    if not text:
        return text, []

    flags: List[str] = []

    for pattern in _DOSING_RES:
        if pattern.search(text):
            flags.append("prescriptive_dosing_blocked")
            return SAFE_REFUSAL, flags

    for pattern in _DIAGNOSIS_RES:
        if pattern.search(text):
            flags.append("diagnostic_claim_disclaimed")
            return text + DIAGNOSIS_DISCLAIMER, flags

    return text, flags
