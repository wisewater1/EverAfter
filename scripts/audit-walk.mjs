/**
 * Full-route runtime smoke test for the audit pass.
 * Visits every reachable route in demo mode plus the public pages, records
 * console errors, page errors, failed requests, and error-boundary triggers,
 * and screenshots each route at phone (390x844) and desktop (1440x900) sizes.
 *
 * Usage: node scripts/audit-walk.mjs [before|after]
 */
import { chromium } from 'playwright';
import { mkdirSync } from 'node:fs';

const BASE = process.env.SMOKE_BASE || 'http://localhost:4340';
const PASS = process.argv[2] || 'before';
const OUT = `audit-artifacts/${PASS}`;
mkdirSync(OUT, { recursive: true });

const PUBLIC_ROUTES = ['/', '/login', '/signup', '/forgot-password', '/reset-password', '/quiz/demo-token'];
const APP_ROUTES = [
  '/dashboard', '/trinity', '/health-dashboard', '/security-dashboard',
  '/family-dashboard', '/family-intelligence', '/finance-dashboard',
  '/anthony-dashboard', '/monitor', '/legacy-vault', '/digital-legacy',
  '/rituals', '/time-capsules', '/council', '/career', '/devices',
  '/personality-training', '/portal', '/portal/profile',
];
const REDIRECTS = [
  ['/raphael', '/health-dashboard'], ['/michael-dashboard', '/security-dashboard'],
  ['/saints', '/dashboard'], ['/ceremonies', '/rituals'],
  ['/pricing', '/'], ['/marketplace', '/'], ['/beyond-modules', '/'],
];

const IGNORED_REQUEST_PATTERNS = [
  /onrender\.com/, // live backend is intentionally absent in this sandbox
];

const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', args: ['--use-gl=swiftshader'] });
const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
const page = await ctx.newPage();

const report = {};
let consoleErrors = [];
let pageErrors = [];
let failedRequests = [];
page.on('console', (m) => { if (m.type() === 'error') consoleErrors.push(m.text().slice(0, 180)); });
page.on('pageerror', (e) => pageErrors.push(String(e).slice(0, 180)));
page.on('requestfailed', (req) => {
  const u = req.url();
  if (u.startsWith('data:')) return;
  if (IGNORED_REQUEST_PATTERNS.some((p) => p.test(u))) return;
  failedRequests.push(`${u.slice(0, 120)} :: ${req.failure()?.errorText}`);
});

const slug = (route) => (route === '/' ? 'landing' : route.replace(/^\//, '').replace(/[/:]/g, '-'));

async function visit(route, { screenshots = true } = {}) {
  consoleErrors = []; pageErrors = []; failedRequests = [];
  const entry = {};
  try {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto(BASE + route, { waitUntil: 'load', timeout: 25000 });
    await page.waitForTimeout(1600);
    const body = (await page.locator('body').innerText().catch(() => '')) || '';
    entry.rendered = body.trim().length > 40;
    entry.textLen = body.length;
    entry.errorBoundary = /something went wrong|unexpected error occurred/i.test(body);
    entry.url = page.url().replace(BASE, '');
    if (screenshots) {
      await page.screenshot({ path: `${OUT}/${slug(route)}-desktop.jpg`, type: 'jpeg', quality: 65 });
      await page.setViewportSize({ width: 390, height: 844 });
      await page.waitForTimeout(700);
      entry.mobileScrollX = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
      await page.screenshot({ path: `${OUT}/${slug(route)}-mobile.jpg`, type: 'jpeg', quality: 65 });
    }
  } catch (e) {
    entry.error = String(e).slice(0, 140);
  }
  entry.consoleErrors = [...new Set(consoleErrors)].slice(0, 5);
  entry.pageErrors = pageErrors.slice(0, 3);
  entry.failedRequests = [...new Set(failedRequests)].slice(0, 5);
  report[route] = entry;
}

// Pass 1: public pages, logged out.
for (const route of PUBLIC_ROUTES) await visit(route);

// Auth form validation: empty submits must show validation, not crash.
try {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto(BASE + '/login', { waitUntil: 'load' });
  await page.waitForTimeout(600);
  await page.getByRole('button', { name: /sign in/i }).first().click();
  await page.waitForTimeout(600);
  const t = await page.locator('body').innerText();
  report['/login'].emptySubmitValidates = /required|enter|invalid|email/i.test(t);
} catch (e) { report['/login'].emptySubmitValidates = 'check failed: ' + String(e).slice(0, 60); }
try {
  await page.goto(BASE + '/signup', { waitUntil: 'load' });
  await page.waitForTimeout(600);
  await page.getByRole('button', { name: /sign up|create/i }).first().click();
  await page.waitForTimeout(600);
  const t = await page.locator('body').innerText();
  report['/signup'].emptySubmitValidates = /required|enter|invalid|email|password/i.test(t);
} catch (e) { report['/signup'].emptySubmitValidates = 'check failed: ' + String(e).slice(0, 60); }

// Enter demo mode from the landing CTA (installs the fetch interceptor).
await page.goto(BASE + '/', { waitUntil: 'load' });
await page.getByText('See the Live Demo').click();
await page.waitForTimeout(2500);
report.demoEntry = { landedOn: page.url().replace(BASE, '') };

// Pass 2: app routes in demo mode.
for (const route of APP_ROUTES) await visit(route);

// Pass 3: redirects resolve to their targets.
report.redirects = {};
for (const [from, to] of REDIRECTS) {
  try {
    await page.goto(BASE + from, { waitUntil: 'load', timeout: 15000 });
    await page.waitForTimeout(900);
    const landed = page.url().replace(BASE, '').split('#')[0] || '/';
    report.redirects[from] = { expected: to, landed, ok: landed === to || landed.startsWith(to) };
  } catch (e) {
    report.redirects[from] = { expected: to, error: String(e).slice(0, 80) };
  }
}

console.log(JSON.stringify(report, null, 2));
await browser.close();
