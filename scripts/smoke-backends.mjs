const DEFAULT_FRONTEND_URL = process.env.SMOKE_FRONTEND_URL || 'http://localhost:5000';
const DEFAULT_APP_API_URL = process.env.SMOKE_API_URL || process.env.VITE_API_BASE_URL || 'http://localhost:8010';
const DEFAULT_HEALTH_API_URL = process.env.SMOKE_HEALTH_API_URL || process.env.VITE_HEALTH_API_BASE_URL || 'http://localhost:4000';
const AUTH_ROUTE = process.env.SMOKE_AUTH_ROUTE || '/api/v1/health/summary';
const AUTH_TOKEN = process.env.SMOKE_BEARER_TOKEN || '';
const SAINT_ID = process.env.SMOKE_SAINT_ID || 'gabriel';
const SAINT_CHAT_MESSAGE = process.env.SMOKE_SAINT_CHAT_MESSAGE || 'One line only: status check.';

function joinUrl(baseUrl, path) {
  return `${String(baseUrl || '').replace(/\/$/, '')}${path.startsWith('/') ? path : `/${path}`}`;
}

async function getResponseSummary(url, options = {}) {
  try {
    const response = await fetch(url, options);
    const contentType = response.headers.get('content-type') || '';
    const body = await response.text();

    return {
      ok: response.ok,
      status: response.status,
      contentType,
      bodyPreview: body.slice(0, 160).replace(/\s+/g, ' '),
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'network request failed';
    return {
      ok: false,
      status: 0,
      contentType: '',
      bodyPreview: message,
    };
  }
}

async function assertUp(label, url, options = {}) {
  const result = await getResponseSummary(url, options);
  if (!result.ok) {
    throw new Error(`${label} failed with ${result.status}: ${result.bodyPreview || 'empty response'}`);
  }
  console.log(`${label}: OK ${result.status} ${url}`);
}

async function assertSaintAvailable(baseUrl, token) {
  const headers = {
    Authorization: `Bearer ${token}`,
    'Content-Type': 'application/json',
  };

  await assertUp(
    `saint bootstrap (${SAINT_ID})`,
    joinUrl(baseUrl, `/api/v1/saints/${SAINT_ID}/bootstrap`),
    {
      method: 'POST',
      headers,
    },
  );

  await assertUp(
    `saint chat (${SAINT_ID})`,
    joinUrl(baseUrl, `/api/v1/saints/${SAINT_ID}/chat`),
    {
      method: 'POST',
      headers,
      body: JSON.stringify({
        message: SAINT_CHAT_MESSAGE,
        coordination_mode: false,
      }),
    },
  );
}

async function main() {
  console.log(`Frontend URL: ${DEFAULT_FRONTEND_URL}`);
  console.log(`App API URL: ${DEFAULT_APP_API_URL}`);
  console.log(`Health API URL: ${DEFAULT_HEALTH_API_URL}`);

  await assertUp('frontend', DEFAULT_FRONTEND_URL);
  await assertUp('app api health', joinUrl(DEFAULT_APP_API_URL, '/health'));
  await assertUp('health-api health', joinUrl(DEFAULT_HEALTH_API_URL, '/health'));

  if (!AUTH_TOKEN) {
    console.log(`authenticated app route: SKIPPED (${AUTH_ROUTE}) because SMOKE_BEARER_TOKEN is not set`);
    console.log(`built-in saint probe: SKIPPED (${SAINT_ID}) because SMOKE_BEARER_TOKEN is not set`);
    return;
  }

  await assertUp(
    'authenticated app route',
    joinUrl(DEFAULT_APP_API_URL, AUTH_ROUTE),
    {
      headers: {
        Authorization: `Bearer ${AUTH_TOKEN}`,
      },
    },
  );

  await assertSaintAvailable(DEFAULT_APP_API_URL, AUTH_TOKEN);
}

main().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
