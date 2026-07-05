import { chromium } from 'playwright';

const BASE = process.env.SMOKE_BASE || 'http://localhost:4319';
const results = { consoleErrors: [], pageErrors: [], failedRequests: [], checks: {} };

const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', args: ['--use-gl=swiftshader', '--enable-webgl', '--ignore-gpu-blocklist'] });
const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
const page = await ctx.newPage();

page.on('console', (msg) => { if (msg.type() === 'error') results.consoleErrors.push(msg.text()); });
page.on('pageerror', (err) => results.pageErrors.push(String(err)));
page.on('requestfailed', (req) => {
  const u = req.url();
  if (!u.startsWith('data:')) results.failedRequests.push(`${u} :: ${req.failure()?.errorText}`);
});

await page.goto(BASE + '/', { waitUntil: 'networkidle', timeout: 30000 });
await page.waitForTimeout(1500);

// Starfield canvases present (overlay + gl)
results.checks.canvasCount = await page.locator('canvas').count();
// Roster: the real five saints must all appear; the wrong ones must not
const body = await page.locator('body').innerText();
const mustHave = ['St. Michael', 'St. Joseph', 'St. Raphael', 'St. Gabriel', 'St. Anthony'];
const mustNotHave = ['St. Martin', 'St. Agatha', 'The Healer', 'Fiesta'];
results.checks.rosterPresent = mustHave.filter((s) => body.includes(s));
results.checks.stalePresent = mustNotHave.filter((s) => body.includes(s));
results.checks.demoButton = body.includes('See the Live Demo');

// Mobile viewport: no horizontal scroll
await page.setViewportSize({ width: 390, height: 844 });
await page.waitForTimeout(600);
results.checks.mobileScrollX = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);

await page.screenshot({ path: '/tmp/claude-0/-home-user-EverAfter/68273ba3-fcf3-57fd-8b10-08be26273e2c/scratchpad/landing-mobile.png' });
await page.setViewportSize({ width: 1280, height: 900 });
await page.waitForTimeout(400);
await page.screenshot({ path: '/tmp/claude-0/-home-user-EverAfter/68273ba3-fcf3-57fd-8b10-08be26273e2c/scratchpad/landing-desktop.png' });

console.log(JSON.stringify(results, null, 2));
await browser.close();
