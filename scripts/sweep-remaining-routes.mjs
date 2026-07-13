/**
 * §4.2 completion sweep: the routes audit-walk.mjs did NOT sample.
 * Visits each remaining route (public logged-out set, then demo-mode app
 * set), recording render status, error-boundary triggers, console/page
 * errors, and native window.alert/confirm/prompt dialogs (tripwire — the
 * app must use styled dialogs everywhere). Also interaction-checks the
 * /creator template editor modal (the former /creator/new dead end).
 *
 * Usage: node scripts/sweep-remaining-routes.mjs   (expects a server on
 * SMOKE_BASE, default http://localhost:4340, serving the production build)
 */
import { chromium } from 'playwright';

const BASE = process.env.SMOKE_BASE || 'http://localhost:4340';

const PUBLIC_UNSAMPLED = [
  '/privacy',
  '/terms',
  '/emergency',
  '/career/public/demo-token',
  '/oauth/callback',
  '/terra/return',
  '/this-route-does-not-exist', // the * catch-all
];

const APP_UNSAMPLED = [
  '/creator',
  '/marketplace',
  '/pricing',
  '/my-ais',
  '/my-files',
  '/files',
  '/settings',
  '/onboarding',
  '/insurance',
  '/insurance/connect',
  '/memorial-services',
  '/admin/portal',
  '/admin/create-user',
  '/dark-glass-carousel',
  '/dev/device-check',
  '/raphael-prototype',
  '/setup/terra',
];

const IGNORED_REQUEST_PATTERNS = [/onrender\.com/];

const browser = await chromium.launch({
  executablePath: '/opt/pw-browsers/chromium',
  args: ['--use-gl=swiftshader'],
});
const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
const page = await ctx.newPage();

const report = {};
let consoleErrors = [];
let pageErrors = [];
let nativeDialogs = [];
page.on('console', (m) => { if (m.type() === 'error') consoleErrors.push(m.text().slice(0, 180)); });
page.on('pageerror', (e) => pageErrors.push(String(e).slice(0, 180)));
page.on('dialog', async (d) => {
  nativeDialogs.push(`${d.type()}: ${d.message().slice(0, 100)}`);
  await d.dismiss().catch(() => {});
});
page.on('requestfailed', (req) => {
  const u = req.url();
  if (u.startsWith('data:')) return;
  if (IGNORED_REQUEST_PATTERNS.some((p) => p.test(u))) return;
  consoleErrors.push(`REQFAIL ${u.slice(0, 100)}`);
});

async function visit(route) {
  consoleErrors = []; pageErrors = []; nativeDialogs = [];
  const entry = {};
  try {
    await page.goto(BASE + route, { waitUntil: 'load', timeout: 25000 });
    await page.waitForTimeout(1500);
    const body = (await page.locator('body').innerText().catch(() => '')) || '';
    entry.rendered = body.trim().length > 40;
    entry.textLen = body.length;
    entry.errorBoundary = /something went wrong|unexpected error occurred/i.test(body);
    entry.landed = page.url().replace(BASE, '') || '/';
  } catch (e) {
    entry.error = String(e).slice(0, 140);
  }
  entry.consoleErrors = [...new Set(consoleErrors)].slice(0, 4);
  entry.pageErrors = pageErrors.slice(0, 3);
  if (nativeDialogs.length) entry.NATIVE_DIALOGS = nativeDialogs;
  report[route] = entry;
}

// Pass 1: logged out.
for (const route of PUBLIC_UNSAMPLED) await visit(route);

// Enter demo mode from the landing CTA.
await page.goto(BASE + '/', { waitUntil: 'load' });
await page.getByText('See the Live Demo').click();
await page.waitForTimeout(2500);
report.demoEntry = { landedOn: page.url().replace(BASE, '') };

// Pass 2: app routes in demo mode.
for (const route of APP_UNSAMPLED) await visit(route);

// Interaction: /creator "New Template" must open the editor modal (was a
// navigate('/creator/new') dead end before this batch).
try {
  consoleErrors = []; pageErrors = []; nativeDialogs = [];
  await page.goto(BASE + '/creator', { waitUntil: 'load', timeout: 25000 });
  await page.waitForTimeout(1500);
  await page.getByRole('button', { name: /new template/i }).first().click();
  await page.waitForTimeout(800);
  const t = await page.locator('body').innerText();
  report.creatorNewTemplateModal = {
    modalOpened: /save draft/i.test(t) && /submit for review/i.test(t),
    stillOnCreator: page.url().includes('/creator'),
    pageErrors: pageErrors.slice(0, 3),
  };
} catch (e) {
  report.creatorNewTemplateModal = { error: String(e).slice(0, 140) };
}

console.log(JSON.stringify(report, null, 2));
await browser.close();
