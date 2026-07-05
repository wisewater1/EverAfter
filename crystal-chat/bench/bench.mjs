#!/usr/bin/env node
// Benchmark harness: Crystal (stdlib HTTP::Server) vs Python (FastAPI/uvicorn)
// Saints chat prototype. Node 18+, no external dependencies -- uses global
// fetch, node:child_process, node:fs only.
//
// For EACH server: start it, warm it, measure it, kill it -- fully
// sequential, so the two servers are never under load at the same time.
// Repeats the whole measurement suite RUNS times and reports medians.
//
// Config is overridable via env vars so a fast smoke run can validate the
// harness before committing to the full (slower) spec run. Whatever values
// are actually used are printed at the top of the run and stored in
// results.json under `config`, so nothing is silently truncated.

import { spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { setTimeout as sleep } from 'node:timers/promises';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const LOG_DIR = path.join(__dirname, 'logs');
fs.mkdirSync(LOG_DIR, { recursive: true });

const CONFIG = {
  runs: intEnv('BENCH_RUNS', 3),
  requestsPerLevel: intEnv('BENCH_REQUESTS_PER_LEVEL', 1500),
  latencyConcurrencies: [1, 25, 100],
  sustainedConcurrency: intEnv('BENCH_SUSTAINED_CONCURRENCY', 100),
  sustainedDurationMs: intEnv('BENCH_SUSTAINED_MS', 20_000),
  errorConcurrency: intEnv('BENCH_ERROR_CONCURRENCY', 300),
  errorDurationMs: intEnv('BENCH_ERROR_MS', 10_000),
  ttfbSamples: intEnv('BENCH_TTFB_SAMPLES', 40),
  warmupRequests: intEnv('BENCH_WARMUP_REQUESTS', 50),
  requestTimeoutMs: intEnv('BENCH_REQUEST_TIMEOUT_MS', 5_000),
  port: intEnv('BENCH_PORT', 8090),
};

function intEnv(name, fallback) {
  const v = process.env[name];
  if (v === undefined || v === '') return fallback;
  const n = parseInt(v, 10);
  return Number.isFinite(n) ? n : fallback;
}

const SERVERS = [
  {
    name: 'crystal',
    cmd: path.join(ROOT, 'bin', 'server'),
    args: [],
    cwd: ROOT,
    env: {
      PORT: String(CONFIG.port),
      FAMILY_FIXTURE_PATH: path.join(ROOT, 'fixtures', 'family.json'),
    },
  },
  {
    name: 'python-fastapi',
    cmd: path.join(ROOT, 'pybench', '.venv', 'bin', 'uvicorn'),
    args: ['app:app', '--host', '0.0.0.0', '--port', String(CONFIG.port), '--log-level', 'warning'],
    cwd: path.join(ROOT, 'pybench'),
    env: {
      FAMILY_FIXTURE_PATH: path.join(ROOT, 'fixtures', 'family.json'),
    },
  },
];

const SAINTS = ['michael', 'joseph', 'raphael', 'gabriel', 'anthony'];
const SAMPLE_NAMES = ['William Anderson', 'Alice Anderson', 'Charlie Chen', 'Susan Anderson', 'Bob Chen', 'Daniel Anderson'];

function baseUrl() {
  return `http://127.0.0.1:${CONFIG.port}`;
}

function requestBody(i) {
  const name = SAMPLE_NAMES[i % SAMPLE_NAMES.length];
  return JSON.stringify({
    message: `Tell me something about ${name} and how the family is doing.`,
    session_id: `bench_${i % 500}`,
  });
}

function saintFor(i) {
  return SAINTS[i % SAINTS.length];
}

// ── process management ──────────────────────────────────────────

function readRSSKb(pid) {
  try {
    const status = fs.readFileSync(`/proc/${pid}/status`, 'utf8');
    const m = status.match(/VmRSS:\s+(\d+)\s+kB/);
    return m ? parseInt(m[1], 10) : null;
  } catch {
    return null;
  }
}

function startServerProcess(serverConfig, tag) {
  const logPath = path.join(LOG_DIR, `${serverConfig.name}-${tag}.log`);
  const logFd = fs.openSync(logPath, 'a');
  const proc = spawn(serverConfig.cmd, serverConfig.args, {
    cwd: serverConfig.cwd,
    env: { ...process.env, ...serverConfig.env },
    stdio: ['ignore', logFd, logFd],
  });
  proc.on('exit', () => {
    try { fs.closeSync(logFd); } catch { /* already closed */ }
  });
  return proc;
}

function waitForExit(proc, timeoutMs = 5000) {
  if (proc.exitCode !== null || proc.signalCode !== null) return Promise.resolve();
  return new Promise((resolve) => {
    const t = setTimeout(resolve, timeoutMs);
    proc.once('exit', () => {
      clearTimeout(t);
      resolve();
    });
  });
}

async function waitForHealthz(timeoutMs = 8000) {
  const deadline = Date.now() + timeoutMs;
  let lastErr = null;
  while (Date.now() < deadline) {
    try {
      const resp = await fetch(`${baseUrl()}/healthz`, { signal: AbortSignal.timeout(500) });
      if (resp.status === 200) {
        const body = await resp.json().catch(() => null);
        if (body && body.status === 'ok') return true;
      }
    } catch (err) {
      lastErr = err;
    }
    await sleep(50);
  }
  throw new Error(`healthz did not become ready in ${timeoutMs}ms (last error: ${lastErr})`);
}

async function stopServerProcess(proc) {
  if (!proc || proc.exitCode !== null || proc.signalCode !== null) return;
  proc.kill('SIGTERM');
  await waitForExit(proc, 3000);
  if (proc.exitCode === null && proc.signalCode === null) {
    proc.kill('SIGKILL');
    await waitForExit(proc, 2000);
  }
}

// ── request helpers ──────────────────────────────────────────────

async function doChatRequest(i, { stream = false } = {}) {
  const saint = saintFor(i);
  const url = `${baseUrl()}/api/v1/saints/${saint}/chat${stream ? '?stream=1' : ''}`;
  const t0 = performance.now();
  const resp = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: requestBody(i),
    signal: AbortSignal.timeout(CONFIG.requestTimeoutMs),
  });
  if (stream) {
    const reader = resp.body.getReader();
    const { value } = await reader.read();
    const ttfb = performance.now() - t0;
    // Drain the rest of the stream so the connection is released cleanly.
    while (true) {
      const chunk = await reader.read();
      if (chunk.done) break;
    }
    return { status: resp.status, ttfb, hadFirstByte: !!value };
  }
  await resp.arrayBuffer();
  const total = performance.now() - t0;
  return { status: resp.status, total };
}

// simple fixed-concurrency worker pool that issues exactly `totalRequests`
// requests, keeping `concurrency` in flight at all times.
async function runPoolCount(concurrency, totalRequests, taskFn) {
  const results = [];
  const errors = [];
  let idx = 0;

  await new Promise((resolve) => {
    let inFlight = 0;
    function launch() {
      if (idx >= totalRequests) {
        if (inFlight === 0) resolve();
        return;
      }
      const myIdx = idx++;
      inFlight++;
      taskFn(myIdx)
        .then((r) => results.push(r))
        .catch((e) => errors.push(String((e && e.message) || e)))
        .finally(() => {
          inFlight--;
          launch();
        });
    }
    const starters = Math.min(concurrency, totalRequests);
    for (let i = 0; i < starters; i++) launch();
  });

  return { results, errors };
}

// runs for a fixed duration instead of a fixed count
async function runPoolDuration(concurrency, durationMs, taskFn) {
  const results = [];
  const errors = [];
  const deadline = Date.now() + durationMs;
  let counter = 0;

  await new Promise((resolve) => {
    let inFlight = 0;
    let stopped = false;
    function launch() {
      if (Date.now() >= deadline) {
        stopped = true;
        if (inFlight === 0) resolve();
        return;
      }
      inFlight++;
      const myIdx = counter++;
      taskFn(myIdx)
        .then((r) => results.push(r))
        .catch((e) => errors.push(String((e && e.message) || e)))
        .finally(() => {
          inFlight--;
          if (stopped) {
            if (inFlight === 0) resolve();
          } else {
            launch();
          }
        });
    }
    const starters = concurrency;
    for (let i = 0; i < starters; i++) launch();
  });

  return { results, errors, issued: counter };
}

function percentile(sortedAsc, p) {
  if (sortedAsc.length === 0) return null;
  const idx = Math.min(sortedAsc.length - 1, Math.max(0, Math.ceil((p / 100) * sortedAsc.length) - 1));
  return sortedAsc[idx];
}

function summarizeLatencies(results) {
  const ok = results.filter((r) => r.status === 200).map((r) => r.total).sort((a, b) => a - b);
  return {
    count: results.length,
    ok_count: ok.length,
    p50_ms: round2(percentile(ok, 50)),
    p95_ms: round2(percentile(ok, 95)),
    p99_ms: round2(percentile(ok, 99)),
    min_ms: ok.length ? round2(ok[0]) : null,
    max_ms: ok.length ? round2(ok[ok.length - 1]) : null,
  };
}

function round2(n) {
  return n === null || n === undefined ? null : Math.round(n * 100) / 100;
}

function median(nums) {
  const arr = nums.filter((n) => n !== null && n !== undefined).slice().sort((a, b) => a - b);
  if (arr.length === 0) return null;
  const mid = Math.floor(arr.length / 2);
  return arr.length % 2 === 0 ? round2((arr[mid - 1] + arr[mid]) / 2) : round2(arr[mid]);
}

// ── one full measurement pass against a running server ───────────

async function measureOnce(serverConfig, runTag) {
  const out = { server: serverConfig.name, run: runTag };

  console.log(`[${serverConfig.name}] [${runTag}] starting process...`);
  let proc = startServerProcess(serverConfig, runTag);
  await waitForHealthz();
  await sleep(200); // let the process settle post-bind
  out.idle_rss_kb = readRSSKb(proc.pid);
  console.log(`[${serverConfig.name}] [${runTag}] ready, pid=${proc.pid}, idle_rss_kb=${out.idle_rss_kb}`);

  // Warmup (not measured)
  console.log(`[${serverConfig.name}] [${runTag}] warming up with ${CONFIG.warmupRequests} requests...`);
  await runPoolCount(10, CONFIG.warmupRequests, (i) => doChatRequest(i));

  // Latency at each concurrency level
  out.latency = {};
  for (const conc of CONFIG.latencyConcurrencies) {
    console.log(`[${serverConfig.name}] [${runTag}] latency test: concurrency=${conc}, requests=${CONFIG.requestsPerLevel}`);
    const t0 = performance.now();
    const { results, errors } = await runPoolCount(conc, CONFIG.requestsPerLevel, (i) => doChatRequest(i));
    const wallMs = performance.now() - t0;
    const summary = summarizeLatencies(results);
    summary.wall_ms = round2(wallMs);
    summary.observed_throughput_rps = round2((summary.ok_count / wallMs) * 1000);
    summary.errors = errors.length;
    out.latency[`c${conc}`] = summary;

    if (conc === CONFIG.latencyConcurrencies[CONFIG.latencyConcurrencies.length - 1]) {
      out.under_load_rss_kb_latency_test = readRSSKb(proc.pid);
    }
  }

  // Streaming TTFB
  console.log(`[${serverConfig.name}] [${runTag}] streaming TTFB test: samples=${CONFIG.ttfbSamples}`);
  const { results: streamResults, errors: streamErrors } = await runPoolCount(5, CONFIG.ttfbSamples, (i) =>
    doChatRequest(i, { stream: true }),
  );
  const ttfbs = streamResults.filter((r) => r.status === 200 && r.hadFirstByte).map((r) => r.ttfb).sort((a, b) => a - b);
  out.streaming_ttfb = {
    samples: streamResults.length,
    errors: streamErrors.length,
    p50_ms: round2(percentile(ttfbs, 50)),
    p95_ms: round2(percentile(ttfbs, 95)),
    min_ms: ttfbs.length ? round2(ttfbs[0]) : null,
    max_ms: ttfbs.length ? round2(ttfbs[ttfbs.length - 1]) : null,
  };

  // Sustained throughput
  console.log(
    `[${serverConfig.name}] [${runTag}] sustained throughput: concurrency=${CONFIG.sustainedConcurrency}, duration=${CONFIG.sustainedDurationMs}ms`,
  );
  const rssample = [];
  const rssTimer = setInterval(() => {
    const v = readRSSKb(proc.pid);
    if (v !== null) rssample.push(v);
  }, 500);
  const sustainedStart = performance.now();
  const { results: sustResults, errors: sustErrors } = await runPoolDuration(
    CONFIG.sustainedConcurrency,
    CONFIG.sustainedDurationMs,
    (i) => doChatRequest(i),
  );
  const sustainedWallMs = performance.now() - sustainedStart;
  clearInterval(rssTimer);
  const sustOk = sustResults.filter((r) => r.status === 200).length;
  out.sustained_throughput = {
    concurrency: CONFIG.sustainedConcurrency,
    duration_ms: round2(sustainedWallMs),
    requests_completed: sustResults.length,
    ok_requests: sustOk,
    errors: sustErrors.length + (sustResults.length - sustOk),
    req_per_sec: round2((sustOk / sustainedWallMs) * 1000),
  };
  out.under_load_rss_kb_sustained_max = rssample.length ? Math.max(...rssample) : null;
  out.under_load_rss_kb_sustained_samples = rssample;

  // Error rate at high concurrency
  console.log(
    `[${serverConfig.name}] [${runTag}] error-rate test: concurrency=${CONFIG.errorConcurrency}, duration=${CONFIG.errorDurationMs}ms`,
  );
  const errStart = performance.now();
  const { results: errResults, errors: errErrors } = await runPoolDuration(
    CONFIG.errorConcurrency,
    CONFIG.errorDurationMs,
    (i) => doChatRequest(i),
  );
  const errWallMs = performance.now() - errStart;
  const nonOk = errResults.filter((r) => r.status !== 200).length;
  const totalIssued = errResults.length + errErrors.length;
  out.error_rate_test = {
    concurrency: CONFIG.errorConcurrency,
    duration_ms: round2(errWallMs),
    total_issued: totalIssued,
    non_200: nonOk,
    timeouts_or_network_errors: errErrors.length,
    error_rate_pct: totalIssued ? round2(((nonOk + errErrors.length) / totalIssued) * 100) : null,
  };

  // Resilience: malformed JSON + 1MB body against the still-live process
  console.log(`[${serverConfig.name}] [${runTag}] resilience: malformed JSON + 1MB body`);
  const resilience = { notes: [] };
  try {
    const malformedResp = await fetch(`${baseUrl()}/api/v1/saints/michael/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: '{"message": this is not valid json',
      signal: AbortSignal.timeout(CONFIG.requestTimeoutMs),
    });
    resilience.malformed_json_status = malformedResp.status;
    resilience.malformed_json_clean_4xx = malformedResp.status >= 400 && malformedResp.status < 500;
  } catch (e) {
    resilience.malformed_json_status = 'NO_RESPONSE';
    resilience.malformed_json_clean_4xx = false;
    resilience.notes.push(`malformed JSON request failed: ${e.message}`);
  }

  try {
    const bigBody = JSON.stringify({ message: 'x'.repeat(1_048_576), session_id: 'resilience_big' });
    const bigResp = await fetch(`${baseUrl()}/api/v1/saints/michael/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: bigBody,
      signal: AbortSignal.timeout(CONFIG.requestTimeoutMs),
    });
    resilience.large_body_1mb_status = bigResp.status;
    resilience.large_body_1mb_clean_4xx = bigResp.status >= 400 && bigResp.status < 500;
  } catch (e) {
    resilience.large_body_1mb_status = 'NO_RESPONSE';
    resilience.large_body_1mb_clean_4xx = false;
    resilience.notes.push(`1MB body request failed: ${e.message}`);
  }

  // Resilience: kill -9 mid-load, restart, confirm /healthz recovers
  console.log(`[${serverConfig.name}] [${runTag}] resilience: kill -9 mid-load, then restart`);
  const burst = [];
  for (let i = 0; i < 30; i++) {
    burst.push(doChatRequest(i).catch(() => ({ status: 'ERR' })));
  }
  await sleep(15); // let some requests be in-flight when we SIGKILL
  proc.kill('SIGKILL');
  await Promise.allSettled(burst);
  await waitForExit(proc, 3000);
  resilience.killed_pid = proc.pid;
  resilience.exit_signal_after_sigkill = proc.signalCode;

  let recovered = false;
  let restartError = null;
  let newProc = null;
  try {
    newProc = startServerProcess(serverConfig, `${runTag}-restart`);
    await waitForHealthz(8000);
    recovered = true;
  } catch (e) {
    restartError = String(e.message || e);
  }
  resilience.recovery_observed = recovered;
  if (restartError) resilience.notes.push(`restart failed: ${restartError}`);
  out.resilience = resilience;

  // Teardown: whichever process is currently alive for this run
  const finalProc = newProc || proc;
  await stopServerProcess(finalProc);
  console.log(`[${serverConfig.name}] [${runTag}] stopped.`);

  return out;
}

// ── main ───────────────────────────────────────────────────────

function estimateSeconds() {
  const perRunFixed = (CONFIG.sustainedDurationMs + CONFIG.errorDurationMs) / 1000;
  // rough: concurrency=1 pass dominates at ~35ms/request
  const c1 = (CONFIG.requestsPerLevel * 35) / 1000;
  const others = CONFIG.latencyConcurrencies
    .filter((c) => c !== 1)
    .reduce((acc, c) => acc + (CONFIG.requestsPerLevel / c) * 0.035, 0);
  const ttfb = (CONFIG.ttfbSamples / 5) * 0.035;
  const perRun = perRunFixed + c1 + others + ttfb + 8; // +8s slack for restarts/warmup
  return Math.round(perRun * CONFIG.runs * SERVERS.length);
}

async function main() {
  console.log('=== crystal-chat vs FastAPI benchmark ===');
  console.log('Configuration actually used for this run:');
  console.log(JSON.stringify(CONFIG, null, 2));
  console.log(`Estimated total runtime: ~${estimateSeconds()}s (rough estimate, logged per spec requirement)`);

  const allResults = [];

  for (const serverConfig of SERVERS) {
    for (let run = 1; run <= CONFIG.runs; run++) {
      const tag = `run${run}`;
      const result = await measureOnce(serverConfig, tag);
      allResults.push(result);
      // brief pause between runs to let the OS reclaim the port/socket
      await sleep(500);
    }
  }

  const byServer = {};
  for (const r of allResults) {
    byServer[r.server] = byServer[r.server] || [];
    byServer[r.server].push(r);
  }

  const medianSummary = {};
  for (const [server, runs] of Object.entries(byServer)) {
    medianSummary[server] = {
      idle_rss_kb: median(runs.map((r) => r.idle_rss_kb)),
      under_load_rss_kb_sustained_max: median(runs.map((r) => r.under_load_rss_kb_sustained_max)),
      latency: {},
      streaming_ttfb_p50_ms: median(runs.map((r) => r.streaming_ttfb.p50_ms)),
      streaming_ttfb_p95_ms: median(runs.map((r) => r.streaming_ttfb.p95_ms)),
      sustained_req_per_sec: median(runs.map((r) => r.sustained_throughput.req_per_sec)),
      error_rate_pct_at_c300: median(runs.map((r) => r.error_rate_test.error_rate_pct)),
      resilience: {
        malformed_json_clean_4xx_all_runs: runs.every((r) => r.resilience.malformed_json_clean_4xx),
        large_body_clean_4xx_all_runs: runs.every((r) => r.resilience.large_body_1mb_clean_4xx),
        recovery_observed_all_runs: runs.every((r) => r.resilience.recovery_observed),
      },
    };
    for (const conc of CONFIG.latencyConcurrencies) {
      const key = `c${conc}`;
      medianSummary[server].latency[key] = {
        p50_ms: median(runs.map((r) => r.latency[key].p50_ms)),
        p95_ms: median(runs.map((r) => r.latency[key].p95_ms)),
        p99_ms: median(runs.map((r) => r.latency[key].p99_ms)),
        observed_throughput_rps: median(runs.map((r) => r.latency[key].observed_throughput_rps)),
      };
    }
  }

  const output = {
    generated_at: new Date().toISOString(),
    config: CONFIG,
    raw_runs: allResults,
    medians: medianSummary,
  };

  const resultsPath = path.join(__dirname, 'results.json');
  fs.writeFileSync(resultsPath, JSON.stringify(output, null, 2));
  console.log(`\nRaw + summarized results written to ${resultsPath}`);

  printSummaryTable(medianSummary);
}

function printSummaryTable(medianSummary) {
  console.log('\n=== SUMMARY (medians across runs) ===\n');
  for (const [server, m] of Object.entries(medianSummary)) {
    console.log(`--- ${server} ---`);
    console.log(`  idle RSS:            ${m.idle_rss_kb} kB`);
    console.log(`  under-load RSS(max): ${m.under_load_rss_kb_sustained_max} kB`);
    for (const [level, lat] of Object.entries(m.latency)) {
      console.log(
        `  latency ${level.padEnd(5)}: p50=${lat.p50_ms}ms p95=${lat.p95_ms}ms p99=${lat.p99_ms}ms throughput=${lat.observed_throughput_rps} req/s`,
      );
    }
    console.log(`  streaming TTFB:      p50=${m.streaming_ttfb_p50_ms}ms p95=${m.streaming_ttfb_p95_ms}ms`);
    console.log(`  sustained throughput (c${CONFIG.sustainedConcurrency}, ${CONFIG.sustainedDurationMs}ms): ${m.sustained_req_per_sec} req/s`);
    console.log(`  error rate (c${CONFIG.errorConcurrency}, ${CONFIG.errorDurationMs}ms): ${m.error_rate_pct_at_c300}%`);
    console.log(
      `  resilience: malformed_json_4xx_all_runs=${m.resilience.malformed_json_clean_4xx_all_runs} large_body_4xx_all_runs=${m.resilience.large_body_clean_4xx_all_runs} recovery_all_runs=${m.resilience.recovery_observed_all_runs}`,
    );
    console.log('');
  }
}

main().catch((err) => {
  console.error('Benchmark failed:', err);
  process.exitCode = 1;
});
