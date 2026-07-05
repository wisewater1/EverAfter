import { chromium } from 'playwright';

const BASE = process.env.SMOKE_BASE || 'http://localhost:4321';
const routes = [
  '/dashboard', '/trinity', '/health-dashboard', '/security-dashboard',
  '/family-dashboard', '/finance-dashboard', '/anthony-dashboard', '/monitor',
  '/legacy-vault', '/rituals', '/family-intelligence', '/portal',
];

const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', args: ['--use-gl=swiftshader'] });
const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
const page = await ctx.newPage();
const consoleErrors = [];
page.on('console', (m) => { if (m.type() === 'error') consoleErrors.push(m.text().slice(0, 200)); });
page.on('pageerror', (e) => consoleErrors.push('PAGEERROR: ' + String(e).slice(0, 200)));

await page.goto(BASE + '/', { waitUntil: 'domcontentloaded' });
await page.getByText('See the Live Demo').click();
await page.waitForTimeout(2500);

const report = {};
for (const route of routes) {
  const before = consoleErrors.length;
  let deadButtons = [];
  let buttonCount = 0, disabledCount = 0;
  try {
    await page.goto(BASE + route, { waitUntil: 'networkidle', timeout: 20000 });
    await page.waitForTimeout(1000);
    // Inventory buttons: count, disabled, and ones with no onclick attr and no href
    const info = await page.evaluate(() => {
      const btns = Array.from(document.querySelectorAll('button'));
      const disabled = btns.filter((b) => b.disabled);
      // Heuristic dead-button: a button with visible text, not disabled, but
      // React handlers aren't in attributes so we can't detect no-op statically.
      // Instead capture labels of disabled buttons (often a sign of blocked features).
      return {
        total: btns.length,
        disabled: disabled.map((b) => (b.textContent || '').trim().slice(0, 40)).filter(Boolean),
      };
    });
    buttonCount = info.total;
    disabledCount = info.disabled.length;
    deadButtons = info.disabled;
  } catch (e) {
    report[route] = { error: String(e).slice(0, 120), consoleErrors: consoleErrors.slice(before) };
    continue;
  }
  report[route] = {
    buttons: buttonCount,
    disabledButtons: [...new Set(deadButtons)],
    consoleErrorsOnLoad: consoleErrors.slice(before),
  };
}

console.log(JSON.stringify(report, null, 2));
await browser.close();
