import { chromium } from 'playwright';

const BASE = process.env.SMOKE_BASE || 'http://localhost:4320';
const routes = ['/dashboard', '/trinity', '/legacy-vault', '/rituals', '/family-dashboard', '/health-dashboard'];
const widths = [{ name: 'phone', w: 390, h: 844 }, { name: 'tablet', w: 820, h: 1180 }];

const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', args: ['--use-gl=swiftshader'] });
const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } });
const page = await ctx.newPage();

// Enter demo mode via the landing CTA so the fetch interceptor is installed.
await page.goto(BASE + '/', { waitUntil: 'domcontentloaded' });
await page.getByText('See the Live Demo').click();
await page.waitForTimeout(2500);

const report = {};
for (const route of routes) {
  const errors = [];
  const onErr = (msg) => { if (msg.type() === 'error') errors.push(msg.text().slice(0, 160)); };
  const onPageErr = (e) => errors.push('PAGEERROR: ' + String(e).slice(0, 160));
  page.on('console', onErr);
  page.on('pageerror', onPageErr);
  report[route] = {};
  for (const { name, w, h } of widths) {
    await page.setViewportSize({ width: w, height: h });
    try {
      await page.goto(BASE + route, { waitUntil: 'networkidle', timeout: 20000 });
      await page.waitForTimeout(1200);
    } catch (e) {
      report[route][name] = { error: String(e).slice(0, 120) };
      continue;
    }
    const scrollX = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    const bodyLen = (await page.locator('body').innerText().catch(() => '')).length;
    report[route][name] = { horizontalScrollPx: scrollX, textLen: bodyLen };
  }
  page.off('console', onErr);
  page.off('pageerror', onPageErr);
  report[route].consoleErrors = errors.slice(0, 5);
}

console.log(JSON.stringify(report, null, 2));
await browser.close();
