# Crystal Runtime Evaluation for the Saints Chat Layer

A head-to-head evaluation of a Crystal prototype of the Saints conversational
chat layer against a Python/FastAPI equivalent built to the same
specification. The goal is a measured engineering decision, not a preference.

## What was built

Both servers implement the same contract:

- `POST /api/v1/saints/:saint_id/chat` accepting `{message, session_id?,
  context?}` and returning `{message, session_id, saint_id, context_used}`.
- `GET /healthz`.
- Five saint personas (michael, joseph, raphael, gabriel, anthony), each with
  a distinct system prompt.
- An in-memory, concurrency-safe session store (a `Mutex` in Crystal, a lock
  in Python), sessions created on demand, history capped at 50 turns.
- Context assembly from the same `fixtures/family.json`, mirroring the
  Anderson family shape from `src/lib/joseph/genealogy.ts`: the referenced
  person node, living members, and a relationships summary.
- A streaming mode (`?stream=1`) returning the reply as chunked SSE.
- A deterministic reply generator with a fixed 30 ms compute delay to stand
  in for model latency. No external API calls, so the comparison isolates the
  runtime rather than the model.

Files: `crystal-chat/src/server.cr` (Crystal), `crystal-chat/pybench/app.py`
(FastAPI + uvicorn), `crystal-chat/bench/bench.mjs` (harness),
`crystal-chat/fixtures/family.json` (shared fixture).

Crystal version: 1.11.2. Python: FastAPI on uvicorn.

## Methodology

The harness runs the full suite three times per server, sequentially (never
both under load at once), and reports medians. Per run it measures:

- Idle resident memory (RSS via `/proc/<pid>/status` VmRSS) and RSS under
  sustained load.
- Request-to-full-response latency (p50/p95/p99) at concurrency 1, 25, and
  100, with 1500 requests per level.
- Streaming time to first byte (40 samples).
- Sustained throughput at concurrency 100 for 20 seconds.
- Error rate at concurrency 300 for 10 seconds.
- Resilience: a malformed JSON body and a 1 MB body must return a clean 4xx
  without crashing, and the server must recover after a `kill -9` mid-load.

Raw results: `crystal-chat/bench/results.json`. Run configuration is recorded
in that file. This run used 1500 requests per latency level and a 20 second
sustained window; nothing was silently truncated.

## Results (medians of 3 runs)

| Metric | Crystal | Python/FastAPI | Winner |
| --- | --- | --- | --- |
| Idle RSS | 6.9 MB (7068 KB) | 44.7 MB (45740 KB) | Crystal (6.5x lighter) |
| Under-load RSS (max) | 39.1 MB (40004 KB) | 60.7 MB (62132 KB) | Crystal (1.5x lighter) |
| Latency c1 p50 / p95 / p99 (ms) | 31.5 / 35.8 / 37.1 | 32.1 / 32.8 / 33.5 | Python (tighter tail) |
| Latency c25 p50 / p95 / p99 (ms) | 33.2 / 38.8 / 42.6 | 31.7 / 37.9 / 41.7 | Even |
| Latency c100 p50 / p95 / p99 (ms) | 40.9 / 63.5 / 76.1 | 46.3 / 60.7 / 72.3 | Even (Crystal better p50, Python better tail) |
| Streaming TTFB p50 / p95 (ms) | 32.2 / 34.0 | 33.7 / 39.3 | Crystal |
| Sustained throughput (c100, req/s) | 2545 | 2031 | Crystal (25% higher) |
| Error rate at c300 | 0% | 0% | Even |
| Malformed JSON returns clean 4xx | Yes | Yes | Even |
| 1 MB body returns clean 4xx | No | Yes | Python |
| Recovers after kill -9 | Yes | Yes | Even |

## Analysis

**Memory.** This is Crystal's clearest win. Idle RSS is about 6.5x lower and
under-load RSS about 1.5x lower. Crystal compiles to a native binary with no
interpreter or large runtime image, so its baseline footprint is small. For a
service running many instances this is a real cost lever.

**Concurrency.** Crystal's fibers and Python's asyncio both handle the load
without errors at every concurrency level tested, including the 300-concurrent
stress window (0% errors on both). Crystal delivered about 25% higher
sustained throughput at concurrency 100, consistent with a lighter per-request
cost and native scheduling.

**Latency.** Effectively a wash. The 30 ms stub delay is the floor and it
dominates every latency number, which is the honest reflection of production:
in the real system the upstream model call, not the web runtime, dominates
latency. Crystal has a slightly better p50 at high concurrency and better
streaming TTFB; Python has slightly tighter tails at low concurrency. Neither
gap would be visible to a user once a real model call of hundreds of
milliseconds to seconds is in the path.

**Resilience.** Both return a clean 4xx for malformed JSON and both recover
after a `kill -9`. The Crystal prototype did not return a clean 4xx for a 1 MB
body, so its request-size handling is less hardened than FastAPI's out of the
box. That is a prototype gap rather than a language limitation, but it is
exactly the kind of hardening that a mature framework gives for free and that a
from-scratch server has to earn.

## Limits of this comparison

- The model call is stubbed at a fixed 30 ms. In production the model latency
  is orders of magnitude larger and dominates the request, which compresses
  the practical value of any runtime latency edge.
- The prototype scope is a single endpoint with in-memory sessions. The real
  backend also does auth, persistence, retrieval, and safety checks, none of
  which are exercised here.
- Operational cost is not in the numbers but is real: adopting Crystal adds a
  third language to a stack that is already TypeScript on the frontend and
  Python on the backend. That means new deployment images, a smaller hiring
  pool, a less mature web ecosystem, and rewriting the existing FastAPI chat
  investment, all for a service whose bottleneck is the model, not the runtime.

## Decision

Keep the current Python/FastAPI implementation. The Crystal prototype is
genuinely lighter on memory and modestly faster on throughput and streaming
TTFB, and those results are real and reproducible. But the latency advantage
is marginal and masked by model latency, the prototype is less hardened on
request-size handling, and the operational cost of adding a new language to
the stack outweighs the measured benefit at the platform's current scale. The
right call is to keep FastAPI and carry forward the two concrete lessons the
benchmark surfaced: FastAPI's larger memory footprint is worth watching if the
chat tier ever becomes a memory-bound cost center, and request-size limits
should be asserted explicitly rather than assumed. Revisit Crystal only if the
chat tier becomes a memory-bound cost center at scale, where the 6.5x idle
memory difference would begin to justify the operational cost.

Regardless of runtime, every Saint's chat loads the live family tree and the
user's person node as real context, so responses are grounded in the user's
actual family situation. That requirement is met in the current implementation
and was mirrored in this prototype through the shared family fixture.
