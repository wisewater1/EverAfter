import { expect, test } from '@playwright/test';
import { clearDemoMode, expectRouteToRender } from './support/demo-mode';

test.describe('Public Auth Flow', () => {
  test('landing page links reach login and signup', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== 'chromium', 'Desktop-only navigation audit.');

    await clearDemoMode(page);
    await page.goto('/');
    await expectRouteToRender(page);

    await page.getByRole('button', { name: /sign in/i }).click();
    await expect(page).toHaveURL(/\/login$/);
    await expectRouteToRender(page);

    await page.goto('/');
    await page.getByRole('button', { name: /start free/i }).click();
    await expect(page).toHaveURL(/\/signup$/);
    await expectRouteToRender(page);
  });

  test('login form exposes expected auth controls', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== 'chromium', 'Desktop-only navigation audit.');

    await clearDemoMode(page);
    await page.goto('/login');
    await expectRouteToRender(page);

    await expect(page.locator('input[type="email"]')).toBeVisible();
    await expect(page.locator('input[type="password"]')).toBeVisible();
    await expect(page.getByRole('link', { name: /forgot password/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /sign in/i })).toBeVisible();
  });
});
