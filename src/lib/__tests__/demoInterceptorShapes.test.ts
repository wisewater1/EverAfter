import { describe, it, expect } from 'vitest';
import { matchEndpoint } from '../demo/demo-data-provider';

// Guards the recurring crash class: demo mocks returning the WRONG container
// shape (object where a bare array is expected) blew up callers doing
// `.map`/`.filter`/`.length` ("c.filter is not a function"). These assert the
// contract — list endpoints return arrays, unmocked endpoints 404 (so callers
// take their graceful fallback instead of crashing on a stub object).

async function bodyOf(r: Response | null) {
  expect(r).not.toBeNull();
  return (r as Response).json();
}

describe('demo interceptor shape contracts', () => {
  it('engrams list returns a BARE ARRAY (callers do data.filter/.map)', async () => {
    const body = await bodyOf(matchEndpoint('/api/v1/engrams/'));
    expect(Array.isArray(body)).toBe(true);
  });

  it('personality-quiz/questions returns an object with a questions ARRAY', async () => {
    const body = await bodyOf(matchEndpoint('/api/v1/personality-quiz/questions'));
    expect(Array.isArray(body.questions)).toBe(true);
    expect(body.questions.length).toBeGreaterThan(0);
  });

  it('personality-quiz/submit scores the posted answers into a profile', async () => {
    const r = matchEndpoint(
      '/api/v1/personality-quiz/submit',
      'POST',
      JSON.stringify({ answers: { o1: 5 }, member_id: 'm', member_name: 'X' }),
    );
    const body = await bodyOf(r);
    expect(body).toHaveProperty('scores');
    expect(body).toHaveProperty('archetype');
  });

  it('an UNMOCKED /api/v1 endpoint returns 404, not a 200 stub (lets callers fall back)', () => {
    const r = matchEndpoint('/api/v1/something/not/mocked');
    expect(r).not.toBeNull();
    expect((r as Response).status).toBe(404);
  });

  it('trinity is intentionally NOT mocked here (routes to 404 so trinityApi local model runs)', () => {
    const r = matchEndpoint('/api/v1/trinity/synapse', 'POST', '{}');
    expect((r as Response | null)?.status ?? 404).toBe(404);
  });

  it('non-API paths pass through (null)', () => {
    expect(matchEndpoint('/assets/index.js')).toBeNull();
  });
});
