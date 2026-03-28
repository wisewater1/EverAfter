import { expect, test } from '@playwright/test';
import {
  collectClientErrors,
  enableDemoMode,
  expectNoClientErrors,
  expectRouteToRender,
  gotoWithDemo,
} from './support/demo-mode';

test.describe('Saint Browser Journeys', () => {
  test('demo bootstrap reaches the protected dashboard', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== 'chromium', 'Desktop-only saint flow audit.');

    const errors = collectClientErrors(page);
    await page.goto('/');
    await expectRouteToRender(page);

    await page.getByRole('button', { name: /demo for show/i }).click();
    await expect(page).toHaveURL(/\/dashboard$/);
    await expect(page.getByRole('heading', { name: /everafter ai/i })).toBeVisible();
    await expectNoClientErrors(errors, 'demo bootstrap');
  });

  test('st michael full scan hands off to anthony ledger', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== 'chromium', 'Desktop-only saint flow audit.');

    const errors = collectClientErrors(page);
    await gotoWithDemo(page, '/security-dashboard');
    await expect(page.getByRole('heading', { name: /st\. michael security/i })).toBeVisible();

    await page.getByRole('button', { name: /full scan/i }).click();
    await expect(page.getByRole('button', { name: /open anthony audit/i })).toBeVisible({ timeout: 20_000 });

    await page.getByRole('button', { name: /open anthony audit/i }).click();
    await expect(page).toHaveURL(/\/anthony-dashboard\?tab=ledger$/);
    await expect(page.getByText(/transaction ledger/i)).toBeVisible();
    await expectNoClientErrors(errors, 'michael scan to anthony handoff');
  });

  test('anthony ledger deep link opens the ledger view directly', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== 'chromium', 'Desktop-only saint flow audit.');

    const errors = collectClientErrors(page);
    await enableDemoMode(page);
    await page.goto('/anthony-dashboard?tab=ledger');
    await expect(page).toHaveURL(/\/anthony-dashboard\?tab=ledger$/);
    await expect(page.getByText(/transaction ledger/i)).toBeVisible();
    await expectNoClientErrors(errors, 'anthony ledger deep link');
  });
});
