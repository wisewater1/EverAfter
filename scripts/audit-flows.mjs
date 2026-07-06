/**
 * Core-flow interaction checks for the audit pass: Council Circle, ancestry
 * tree, soul profile cards, comparison mode, and the timeline Echoes toggle.
 *
 * Usage: node scripts/audit-flows.mjs
 */
import { chromium } from 'playwright';

const BASE = process.env.SMOKE_BASE || 'http://localhost:4340';
const results = [];
const errors = [];
const check = (name, pass, detail = '') => results.push({ name, pass, detail });

const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', args: ['--use-gl=swiftshader'] });
const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
const page = await ctx.newPage();
page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text().slice(0, 140)); });
page.on('pageerror', (e) => errors.push('PAGEERROR: ' + String(e).slice(0, 140)));

await page.goto(BASE + '/', { waitUntil: 'load' });
await page.getByText('See the Live Demo').click();
await page.waitForTimeout(2500);

// 1. Council Circle: five guardians plus the central You, and a full deliberation.
await page.goto(BASE + '/council', { waitUntil: 'load' });
await page.waitForTimeout(1200);
const saintNodes = await page.locator('[data-testid^="council-saint-"]').count();
const youNode = await page.locator('[data-testid="council-you"]').count();
check('Council Circle renders saint nodes', saintNodes === 5, `found ${saintNodes} (real roster is five saints; six was requested and is parked as a decision)`);
check('Council Circle renders the central You seat', youNode === 1, `found ${youNode}`);
await page.getByPlaceholder(/dilemma/i).fill('Should we plan a family gathering this season?');
await page.getByRole('button', { name: /bring this question/i }).click();
await page.waitForTimeout(5200);
const councilText = await page.locator('body').innerText();
check('Council deliberation produces a consensus', /Council's Consensus/i.test(councilText), '');
check('Council states its answer provenance', /live council service|family record on this device/i.test(councilText), '');
await page.screenshot({ path: 'audit-artifacts/before/council-deliberated-desktop.jpg', type: 'jpeg', quality: 65 });

// 2. Ancestry tree renders on the family dashboard tree tab.
await page.goto(BASE + '/family-dashboard', { waitUntil: 'load' });
await page.waitForTimeout(1800);
const treeText = await page.locator('body').innerText();
check('Ancestry tree tab renders content', /family tree/i.test(treeText) && treeText.length > 400, `len ${treeText.length}`);

// 3. Timeline tab: the Echoes toggle triggers without crashing.
try {
  await page.getByRole('button', { name: /^Timeline$/i }).first().click();
  await page.waitForTimeout(1500);
  const echoBtn = page.getByRole('button', { name: /Echoes/i }).first();
  if (await echoBtn.count() > 0) {
    await echoBtn.click();
    await page.waitForTimeout(900);
    const after = await page.locator('body').innerText();
    check('Timeline Echoes toggle works', !/something went wrong/i.test(after), '');
    await page.screenshot({ path: 'audit-artifacts/before/family-timeline-echoes-desktop.jpg', type: 'jpeg', quality: 65 });
  } else {
    check('Timeline Echoes toggle works', false, 'Echoes toggle not found on timeline tab');
  }
} catch (e) { check('Timeline Echoes toggle works', false, String(e).slice(0, 90)); }

// 4. Soul profiles: member cards on family intelligence open a detail panel.
await page.goto(BASE + '/family-intelligence', { waitUntil: 'load' });
await page.waitForTimeout(1600);
try {
  const before = await page.locator('body').innerText();
  const card = page.locator('button, [role="button"], .cursor-pointer').filter({ hasText: /risk|improving|declining|stable/i }).first();
  if (await card.count() > 0) {
    await card.click();
    await page.waitForTimeout(900);
    const after = await page.locator('body').innerText();
    check('Soul profile card opens a detail view', after !== before && !/something went wrong/i.test(after), '');
    await page.screenshot({ path: 'audit-artifacts/before/family-intelligence-profile-desktop.jpg', type: 'jpeg', quality: 65 });
  } else {
    check('Soul profile card opens a detail view', false, 'no member card found');
  }
} catch (e) { check('Soul profile card opens a detail view', false, String(e).slice(0, 90)); }

// 5. Comparison mode: Delphi tab compare view on the family dashboard.
await page.goto(BASE + '/family-dashboard?tab=delphi', { waitUntil: 'load' });
await page.waitForTimeout(1800);
try {
  const compareBtn = page.getByRole('tab', { name: /compare/i }).first();
  if (await compareBtn.count() > 0) {
    await compareBtn.click();
    await page.waitForTimeout(1100);
    const t = await page.locator('body').innerText();
    check('Comparison mode opens', !/something went wrong/i.test(t), '');
    await page.screenshot({ path: 'audit-artifacts/before/family-compare-desktop.jpg', type: 'jpeg', quality: 65 });
  } else {
    const t = await page.locator('body').innerText();
    check('Comparison mode opens', /compare|trajectory/i.test(t), 'no explicit compare button; checked tab content');
  }
} catch (e) { check('Comparison mode opens', false, String(e).slice(0, 90)); }

check('No page errors during core flows', errors.filter((e) => e.startsWith('PAGEERROR')).length === 0, errors.slice(0, 4).join(' | '));

console.log(JSON.stringify({ results, consoleErrors: errors.slice(0, 8) }, null, 2));
await browser.close();
