# crystal-chat

A working Crystal prototype of the EverAfter Saints chat layer (St. Michael,
St. Joseph, St. Raphael, St. Gabriel, St. Anthony), benchmarked head to head
against a Python/FastAPI server implementing the exact same contract, fixture
data, and simulated model-compute delay. Built to answer one question: is it
worth adding Crystal to the stack for this workload?

See `../docs/CRYSTAL_RUNTIME_EVALUATION.md` for the full writeup, methodology,
measured results, and decision.

## Layout

```
crystal-chat/
  src/server.cr          Crystal HTTP::Server implementation
  fixtures/family.json   Shared family fixture (mirrors src/lib/joseph/genealogy.ts DEFAULT_MEMBERS)
  pybench/app.py         FastAPI equivalent, same contract
  pybench/.venv/         Python virtualenv (fastapi + uvicorn)
  bench/bench.mjs        Node benchmark harness (no external deps)
  bench/results.json     Raw + summarized results from the last run
  bench/logs/            stdout/stderr logs captured per server process per run
  bin/server             Compiled Crystal release binary (build artifact)
```

## Prerequisites

- Crystal 1.11.2+ (`crystal --version`)
- Python 3.11+ with `venv` module
- Node 18+ (for `fetch`, used by the bench harness)

## Build

```bash
cd crystal-chat
crystal build --release -o bin/server src/server.cr
```

## Run the Crystal server

```bash
PORT=8081 ./bin/server
# optional: FAMILY_FIXTURE_PATH=/abs/path/to/family.json PORT=8081 ./bin/server
```

Endpoints:
- `GET /healthz` -> `{"status":"ok"}`
- `POST /api/v1/saints/:saint_id/chat` with body `{"message": "...", "session_id": "...", "context": "..."}` (session_id and context are optional)
  - `saint_id` is one of `michael`, `joseph`, `raphael`, `gabriel`, `anthony`
  - append `?stream=1` to get a chunked `text/event-stream` response instead of a single JSON body

Example:
```bash
curl -X POST "http://127.0.0.1:8081/api/v1/saints/raphael/chat" \
  -H 'Content-Type: application/json' \
  -d '{"message": "How is William Anderson doing?"}'
```

## Set up and run the Python comparison server

```bash
cd crystal-chat/pybench
python3 -m venv .venv
./.venv/bin/pip install fastapi uvicorn
FAMILY_FIXTURE_PATH="$(pwd)/../fixtures/family.json" ./.venv/bin/uvicorn app:app --host 0.0.0.0 --port 8082
```

## Run the benchmark

The harness starts each server, warms it up, measures it, and kills it --
fully sequential, so the two servers are never under load at the same time.
It repeats the full measurement suite 3 times and reports medians.

```bash
cd crystal-chat/bench
node bench.mjs
```

This runs the full spec (>=1500 requests per latency concurrency level,
20s sustained-throughput window, 10s error-rate window, 3 repeats) and takes
roughly 9-10 minutes end to end (both servers combined). Every request count,
duration, and concurrency actually used is printed at the start of the run
and stored under `results.json.config`, so nothing is silently reduced.

To do a fast sanity check of the harness itself (not a valid benchmark
result, just a smoke test), shrink the knobs with env vars:

```bash
BENCH_RUNS=1 BENCH_REQUESTS_PER_LEVEL=30 BENCH_SUSTAINED_MS=1500 \
BENCH_ERROR_MS=1500 BENCH_TTFB_SAMPLES=6 BENCH_WARMUP_REQUESTS=5 \
BENCH_ERROR_CONCURRENCY=50 node bench.mjs
```

Available env overrides: `BENCH_RUNS`, `BENCH_REQUESTS_PER_LEVEL`,
`BENCH_SUSTAINED_CONCURRENCY`, `BENCH_SUSTAINED_MS`, `BENCH_ERROR_CONCURRENCY`,
`BENCH_ERROR_MS`, `BENCH_TTFB_SAMPLES`, `BENCH_WARMUP_REQUESTS`,
`BENCH_REQUEST_TIMEOUT_MS`, `BENCH_PORT`.

Output: `bench/results.json` (raw per-run data + medians) and a printed
summary table.

## Notes on the fixture and the "LLM"

- `fixtures/family.json` mirrors the 11-member `DEFAULT_MEMBERS` sample
  family from `src/lib/joseph/genealogy.ts`, plus its parent/spouse/sibling
  relationships and a handful of representative life events.
- Both servers use a deterministic reply stub (persona greeting + assembled
  family-context summary + echo of the question) after a fixed 30ms sleep
  standing in for real model compute. There are no external API calls in
  either server. This isolates transport/runtime overhead from LLM latency,
  which is the whole point of the comparison -- see the docs for why that
  also limits what this benchmark can tell you about production latency.
