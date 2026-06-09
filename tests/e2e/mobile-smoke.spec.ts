import { expect, Page, test } from '@playwright/test';
import {
  collectClientErrors,
  enableDemoMode,
  expectNoClientErrors,
  expectRouteToRender,
} from './support/demo-mode';

const mobileProjects = new Set(['Mobile Chrome', 'Mobile Safari']);

async function expectNoHorizontalOverflow(page: Page) {
  const hasOverflow = await page.evaluate(
    () => document.documentElement.scrollWidth > document.documentElement.clientWidth + 2,
  );
  expect(hasOverflow).toBe(false);
}

test.describe('Mobile Route Smoke', () => {
  test('public routes stay readable on mobile', async ({ page }, testInfo) => {
    test.skip(!mobileProjects.has(testInfo.project.name), 'Mobile-only smoke coverage.');

    for (const path of ['/', '/login', '/signup']) {
      const errors = collectClientErrors(page);
      await page.goto(path);
      await expectRouteToRender(page);
      await expectNoHorizontalOverflow(page);
      await expectNoClientErrors(errors, `${testInfo.project.name} ${path}`);
    }
  });

  test('critical dashboards render on mobile in demo mode', async ({ page }, testInfo) => {
    test.skip(!mobileProjects.has(testInfo.project.name), 'Mobile-only smoke coverage.');

    await enableDemoMode(page);

    for (const path of ['/dashboard', '/health-dashboard', '/security-dashboard']) {
      const errors = collectClientErrors(page);
      await page.goto(path);
      await expectRouteToRender(page);
      await expectNoHorizontalOverflow(page);
      await expectNoClientErrors(errors, `${testInfo.project.name} ${path}`);
    }
  });
});
