import { describe, it, expect } from 'vitest';
import { matchEndpoint } from '../demo/demo-data-provider';

// Guards the recurring crash class: demo mocks returning the WRONG container
// shape (object where a bare array is expected) blew up callers doing
// `.map`/`.filter`/`.length` ("c.filter is not a function"). These assert the
// contract: list endpoints return arrays, unmocked endpoints 404 (so callers
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

  // ── St. Joseph family-home board (api-client unwraps {tasks}/{task}/…) ──

  it('family-home/tasks returns {tasks: []} and POST returns {task} (and persists it)', async () => {
    const list1 = await bodyOf(matchEndpoint('/api/v1/family-home/tasks'));
    expect(Array.isArray(list1.tasks)).toBe(true);
    const before = list1.tasks.length;

    const created = await bodyOf(
      matchEndpoint('/api/v1/family-home/tasks', 'POST', JSON.stringify({ action: 'Test task', category: 'family' })),
    );
    expect(created.task).toBeTruthy();
    expect(created.task.action).toBe('Test task');
    expect(created.task.id).toBeTruthy();

    const list2 = await bodyOf(matchEndpoint('/api/v1/family-home/tasks'));
    expect(list2.tasks.length).toBe(before + 1);
  });

  it('family-home shopping/calendar/bulletin return their unwrap shapes', async () => {
    const shopping = await bodyOf(matchEndpoint('/api/v1/family-home/shopping'));
    expect(Array.isArray(shopping.items)).toBe(true);
    const calendar = await bodyOf(matchEndpoint('/api/v1/family-home/calendar'));
    expect(Array.isArray(calendar.events)).toBe(true);
    const bulletin = await bodyOf(matchEndpoint('/api/v1/family-home/bulletin'));
    expect(Array.isArray(bulletin.messages)).toBe(true);
    const posted = await bodyOf(
      matchEndpoint('/api/v1/family-home/bulletin', 'POST', JSON.stringify({ text: 'hi', author: 'Test' })),
    );
    expect(posted.message.text).toBe('hi');
  });

  // ── Engram actions (previously swallowed by the generic /engram stub) ──

  it('engrams/create echoes an EngramResponse and the new engram appears in the list', async () => {
    const created = await bodyOf(
      matchEndpoint('/api/v1/engrams/create', 'POST', JSON.stringify({ name: 'Test Sage', archetype: 'The Sage' })),
    );
    expect(created.name).toBe('Test Sage');
    expect(created.id).toBeTruthy();
    expect(created.training_status).toBeTruthy();

    const list = await bodyOf(matchEndpoint('/api/v1/engrams/'));
    expect(Array.isArray(list)).toBe(true);
    expect(list.some((e: { id: string }) => e.id === created.id)).toBe(true);
  });

  it('engrams/:id/analyze returns {traits:[{name,value 0..1}×5]}', async () => {
    const body = await bodyOf(matchEndpoint('/api/v1/engrams/eng-margaret/analyze', 'POST'));
    expect(Array.isArray(body.traits)).toBe(true);
    expect(body.traits).toHaveLength(5);
    for (const t of body.traits) {
      expect(typeof t.name).toBe('string');
      expect(t.value).toBeGreaterThanOrEqual(0);
      expect(t.value).toBeLessThanOrEqual(1);
    }
  });

  it('engrams batch-sync maps member ids to engram ids', async () => {
    const body = await bodyOf(
      matchEndpoint('/api/v1/engrams/batch-sync', 'POST', JSON.stringify([{ id: 'm1' }, { id: 'm2' }])),
    );
    expect(body.m1).toBeTruthy();
    expect(body.m2).toBeTruthy();
  });

  // ── Finance (live gabriel/finance.ts expects BARE arrays) ──

  it('finance/budget returns a BARE BudgetEnvelope[] with category fields', async () => {
    const body = await bodyOf(matchEndpoint('/api/v1/finance/budget?month=2026-07'));
    expect(Array.isArray(body)).toBe(true);
    expect(body.length).toBeGreaterThan(0);
    expect(body[0]).toHaveProperty('category_id');
    expect(body[0]).toHaveProperty('assigned');
    expect(body[0]).toHaveProperty('available');
  });

  it('finance/transactions returns a BARE Transaction[] and POST echoes + persists', async () => {
    const list1 = await bodyOf(matchEndpoint('/api/v1/finance/transactions?limit=50'));
    expect(Array.isArray(list1)).toBe(true);
    const before = list1.length;

    const created = await bodyOf(
      matchEndpoint('/api/v1/finance/transactions', 'POST', JSON.stringify({ payee: 'Test Store', amount: -12.5, category_id: 'cat-groceries' })),
    );
    expect(created.payee).toBe('Test Store');
    expect(created.id).toBeTruthy();

    const list2 = await bodyOf(matchEndpoint('/api/v1/finance/transactions?limit=50'));
    expect(list2.length).toBe(before + 1);
  });

  it('finance/bank/status returns a BankStatusResponse; wisegold is honestly 404', async () => {
    const status = await bodyOf(matchEndpoint('/api/v1/finance/bank/status'));
    expect(status.provider).toBe('plaid');
    expect(Array.isArray(status.connections)).toBe(true);

    const wisegold = matchEndpoint('/api/v1/finance/wisegold/wallet');
    expect((wisegold as Response).status).toBe(404);
  });

  // ── Previously-404 read endpoints now mocked ──

  it('health/predictions returns the AnalyticsData shape', async () => {
    const body = await bodyOf(matchEndpoint('/api/v1/health/predictions?lookbackDays=30'));
    expect(body.analysis).toBeTruthy();
    expect(Array.isArray(body.patterns)).toBe(true);
    expect(Array.isArray(body.correlations)).toBe(true);
    expect(Array.isArray(body.insights)).toBe(true);
    expect(Array.isArray(body.recommendations)).toBe(true);
  });

  it('saints/status returns a BARE SaintStatusSummary[]', async () => {
    const body = await bodyOf(matchEndpoint('/api/v1/saints/status'));
    expect(Array.isArray(body)).toBe(true);
    expect(body[0]).toHaveProperty('saint_id');
    expect(body[0]).toHaveProperty('is_active');
  });

  it('social action endpoints are not swallowed by the /social/interact read', async () => {
    const boost = await bodyOf(matchEndpoint('/api/v1/social/boost?count=5', 'POST'));
    expect(boost.ok).toBe(true);
    const random = await bodyOf(matchEndpoint('/api/v1/social/interact/random', 'POST'));
    expect(random.ok).toBe(true);
    const feed = await bodyOf(matchEndpoint('/api/v1/social/feed'));
    expect(Array.isArray(feed)).toBe(true);
  });

  // ── Supabase Edge Functions (/functions/v1/*) ──

  it('career-chat returns {reply} (CareerChat reads response.reply)', async () => {
    const body = await bodyOf(
      matchEndpoint('https://demo.supabase.co/functions/v1/career-chat', 'POST', JSON.stringify({ input: 'How are my goals?' })),
    );
    expect(typeof body.reply).toBe('string');
    expect(body.reply.length).toBeGreaterThan(0);
  });

  it('insights-report returns {report} with findings', async () => {
    const body = await bodyOf(matchEndpoint('https://demo.supabase.co/functions/v1/insights-report', 'POST', '{}'));
    expect(body.report).toBeTruthy();
    expect(Array.isArray(body.report.findings)).toBe(true);
  });

  it('vault-integrity-check returns {message}; stripe-checkout is refused with DEMO_MODE', async () => {
    const integrity = await bodyOf(matchEndpoint('https://demo.supabase.co/functions/v1/vault-integrity-check', 'POST', '{}'));
    expect(typeof integrity.message).toBe('string');

    const stripe = matchEndpoint('https://demo.supabase.co/functions/v1/stripe-checkout', 'POST', '{}');
    expect((stripe as Response).status).toBe(400);
    const stripeBody = await (stripe as Response).clone().json();
    expect(stripeBody.code).toBe('DEMO_MODE');
  });

  it('an UNMOCKED edge function returns 404 (never reaches the real project)', () => {
    const r = matchEndpoint('https://demo.supabase.co/functions/v1/some-future-function', 'POST', '{}');
    expect(r).not.toBeNull();
    expect((r as Response).status).toBe(404);
  });
});
