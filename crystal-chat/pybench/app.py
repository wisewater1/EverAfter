"""
EverAfter Saints Chat -- Python/FastAPI comparison target.

Implements the SAME contract as crystal-chat/src/server.cr so the two can be
benchmarked head to head:
  - POST /api/v1/saints/{saint_id}/chat  {message, session_id?, context?}
    -> {message, session_id, saint_id, context_used}
  - GET  /healthz -> {status: "ok"}
  - ?stream=1 -> chunked SSE (multiple "data: " lines)
  - Same five personas, same family fixture, same 30ms asyncio.sleep stand-in
    for model compute, same 50-turn session history cap, same 100KB body
    ceiling and same error envelope shape as the Crystal server.

No external LLM calls. Deterministic stub reply only.
"""

import asyncio
import json
import os
import secrets
from pathlib import Path
from typing import Optional

from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse, StreamingResponse

MAX_BODY_BYTES = 100_000
MAX_HISTORY_TURNS = 50

FIXTURE_PATH = os.environ.get(
    "FAMILY_FIXTURE_PATH",
    str(Path(__file__).resolve().parent.parent / "fixtures" / "family.json"),
)

PERSONAS = {
    "michael": "You are Archangel Michael, protector and warrior of light.",
    "joseph": "You are St. Joseph, quiet guardian of family, home, and lineage.",
    "raphael": "You are St. Raphael, a compassionate health companion.",
    "gabriel": "You are Archangel Gabriel, herald and messenger of hope.",
    "anthony": "You are St. Anthony, patron of the lost and forgotten.",
}

PERSONA_GREETING = {
    "michael": "Stand firm -- I am with you.",
    "joseph": "Peace to your household.",
    "raphael": "I'm here with you, gently and without judgment.",
    "gabriel": "Good news travels -- listen closely.",
    "anthony": "What is lost can still be found.",
}

with open(FIXTURE_PATH, "r") as f:
    FAMILY = json.load(f)

MEMBERS = FAMILY["members"]
RELATIONSHIPS = FAMILY["relationships"]
EVENTS = FAMILY["events"]
MEMBERS_BY_ID = {m["id"]: m for m in MEMBERS}


def member_name(member_id: str) -> str:
    m = MEMBERS_BY_ID.get(member_id)
    return f"{m['firstName']} {m['lastName']}" if m else member_id


def full_name(member: dict) -> str:
    return f"{member['firstName']} {member['lastName']}"


def find_referenced_member(text: str) -> Optional[dict]:
    lower = text.lower()
    for m in MEMBERS:
        if full_name(m).lower() in lower:
            return m
    for m in MEMBERS:
        if m["firstName"].lower() in lower:
            return m
    return None


def relationships_summary(member: dict) -> str:
    mid = member["id"]
    parents = [member_name(r["fromId"]) for r in RELATIONSHIPS if r["type"] == "parent" and r["toId"] == mid]
    spouse_rel = next(
        (r for r in RELATIONSHIPS if r["type"] == "spouse" and (r["fromId"] == mid or r["toId"] == mid)),
        None,
    )
    children = [member_name(r["toId"]) for r in RELATIONSHIPS if r["type"] == "parent" and r["fromId"] == mid]
    siblings = [
        member_name(r["toId"] if r["fromId"] == mid else r["fromId"])
        for r in RELATIONSHIPS
        if r["type"] == "sibling" and (r["fromId"] == mid or r["toId"] == mid)
    ]

    parts = []
    if parents:
        parts.append(f"parents: {', '.join(parents)}")
    if spouse_rel:
        other_id = spouse_rel["toId"] if spouse_rel["fromId"] == mid else spouse_rel["fromId"]
        parts.append(f"spouse: {member_name(other_id)}")
    if children:
        parts.append(f"children: {', '.join(children)}")
    if siblings:
        parts.append(f"siblings: {', '.join(siblings)}")
    return "; ".join(parts) if parts else "no recorded relationships"


def build_context_summary(referenced: Optional[dict], living: list) -> str:
    parts = []
    if referenced:
        piece = f"Referenced family member: {full_name(referenced)} (generation {referenced['generation']}"
        if referenced.get("birthDate"):
            piece += f", b. {referenced['birthDate']}"
        if referenced.get("deathDate"):
            piece += f", d. {referenced['deathDate']}"
        piece += f") -- {relationships_summary(referenced)}. "
        parts.append(piece)
    else:
        parts.append("No specific family member was referenced in the message. ")
    parts.append(f"Living members ({len(living)}): {', '.join(m['firstName'] for m in living)}. ")
    parts.append(
        f"Family graph: {len(MEMBERS)} members, {len(RELATIONSHIPS)} relationships, {len(EVENTS)} recorded events."
    )
    return "".join(parts)


def build_reply(saint_id: str, context_used: str, message: str) -> str:
    greeting = PERSONA_GREETING[saint_id]
    return f'{greeting} {context_used} You asked: "{message}"'


class SessionStore:
    """Session store for the asyncio single-threaded event loop.

    uvicorn (default) runs one process / one event loop per worker, and
    since there are no `await` points inside the critical section below,
    this dict mutation is not preemptible -- equivalent in spirit to the
    Crystal Mutex-guarded store, but relies on cooperative scheduling
    rather than an explicit lock. An asyncio.Lock is included anyway to
    make the equivalence explicit and to keep behavior correct if this is
    ever run with threaded request handling.
    """

    def __init__(self):
        self._sessions: dict[str, list[dict]] = {}
        self._lock = asyncio.Lock()

    async def append(self, session_id: str, role: str, content: str) -> int:
        async with self._lock:
            history = self._sessions.setdefault(session_id, [])
            history.append({"role": role, "content": content})
            overflow = len(history) - MAX_HISTORY_TURNS
            if overflow > 0:
                del history[:overflow]
            return len(history)

    async def session_count(self) -> int:
        async with self._lock:
            return len(self._sessions)


SESSIONS = SessionStore()

app = FastAPI()


def json_error(status_code: int, code: str, message: str, hint: str) -> JSONResponse:
    return JSONResponse(status_code=status_code, content={"code": code, "message": message, "hint": hint})


@app.get("/healthz")
async def healthz():
    return {"status": "ok"}


@app.post("/api/v1/saints/{saint_id}/chat")
async def chat(saint_id: str, request: Request):
    if saint_id not in PERSONAS:
        return json_error(
            404, "SAINT_NOT_FOUND", f"Unknown saint_id '{saint_id}'", f"Use one of: {', '.join(PERSONAS.keys())}"
        )

    # Enforce the same body-size ceiling as the Crystal server. Read
    # incrementally so an oversized body never gets fully buffered.
    body_chunks = []
    total = 0
    too_large = False
    async for chunk in request.stream():
        total += len(chunk)
        if total > MAX_BODY_BYTES:
            too_large = True
            break
        body_chunks.append(chunk)

    if too_large:
        return json_error(413, "PAYLOAD_TOO_LARGE", f"Request body exceeds {MAX_BODY_BYTES} bytes", "Reduce the request body size")

    raw_body = b"".join(body_chunks).decode("utf-8", errors="replace")

    if not raw_body.strip():
        return json_error(400, "EMPTY_BODY", "Request body must be JSON", 'Send a JSON body like {"message": "..."}')

    try:
        parsed = json.loads(raw_body)
    except json.JSONDecodeError:
        return json_error(400, "BAD_JSON", "Malformed JSON body", "Ensure the request body is valid JSON")

    if not isinstance(parsed, dict):
        return json_error(400, "BAD_JSON", "Malformed JSON body", "Ensure the request body is valid JSON")

    message = parsed.get("message") or ""
    if not isinstance(message, str) or not message.strip():
        return json_error(
            400,
            "MISSING_MESSAGE",
            '"message" field is required and must be a non-empty string',
            "Include a non-empty message field in the JSON body",
        )

    session_id = parsed.get("session_id") or None
    if not session_id:
        session_id = f"sess_{secrets.token_hex(12)}"

    extra_context = parsed.get("context") or ""
    if not isinstance(extra_context, str):
        extra_context = ""

    await SESSIONS.append(session_id, "user", message)

    referenced = find_referenced_member(f"{message} {extra_context}")
    living = [m for m in MEMBERS if not m.get("deathDate")]
    context_used = build_context_summary(referenced, living)

    # Simulate model compute latency (deterministic stub, no external calls).
    await asyncio.sleep(0.03)

    reply = build_reply(saint_id, context_used, message)
    await SESSIONS.append(session_id, "assistant", reply)

    if request.query_params.get("stream") == "1":

        async def event_stream():
            words = reply.split(" ")
            for i in range(0, len(words), 4):
                slice_ = " ".join(words[i : i + 4])
                yield f"data: {slice_}\n\n"
            done_payload = json.dumps(
                {"done": True, "session_id": session_id, "saint_id": saint_id, "context_used": context_used}
            )
            yield f"data: {done_payload}\n\n"

        return StreamingResponse(
            event_stream(),
            media_type="text/event-stream",
            headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"},
        )

    return {"message": reply, "session_id": session_id, "saint_id": saint_id, "context_used": context_used}
