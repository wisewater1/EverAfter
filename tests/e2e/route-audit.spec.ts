import { expect, Page, test } from '@playwright/test';
import {
  clearDemoMode,
  collectClientErrors,
  enableDemoMode,
  expectNoClientErrors,
  expectRouteToRender,
} from './support/demo-mode';

interface RouteExpectation {
  path: string;
  expectedUrl: RegExp;
}

function exactPath(path: string) {
  const escaped = path.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return new RegExp(`${escaped}$`);
}

const publicRoutes: RouteExpectation[] = [
  { path: '/', expectedUrl: exactPath('/') },
  { path: '/login', expectedUrl: exactPath('/login') },
  { path: '/signup', expectedUrl: exactPath('/signup') },
  { path: '/forgot-password', expectedUrl: exactPath('/forgot-password') },
  { path: '/reset-password', expectedUrl: exactPath('/reset-password') },
];

const coreProtectedRoutes: RouteExpectation[] = [
  { path: '/dashboard', expectedUrl: exactPath('/dashboard') },
  { path: '/onboarding', expectedUrl: exactPath('/onboarding') },
  { path: '/portal', expectedUrl: exactPath('/portal') },
  { path: '/portal/profile', expectedUrl: exactPath('/portal/profile') },
  { path: '/health-dashboard', expectedUrl: exactPath('/health-dashboard') },
  { path: '/security-dashboard', expectedUrl: exactPath('/security-dashboard') },
  { path: '/family-dashboard', expectedUrl: exactPath('/family-dashboard') },
  { path: '/anthony-dashboard', expectedUrl: exactPath('/anthony-dashboard') },
  { path: '/finance-dashboard', expectedUrl: exactPath('/finance-dashboard') },
  { path: '/monitor', expectedUrl: exactPath('/monitor') },
  { path: '/trinity', expectedUrl: exactPath('/trinity') },
  { path: '/devices', expectedUrl: exactPath('/devices') },
  { path: '/digital-legacy', expectedUrl: exactPath('/digital-legacy') },
  { path: '/legacy-vault', expectedUrl: exactPath('/legacy-vault') },
];

const nonCoreRoutes: RouteExpectation[] = [
  { path: '/pricing', expectedUrl: exactPath('/pricing') },
  { path: '/marketplace', expectedUrl: exactPath('/marketplace') },
  { path: '/creator', expectedUrl: exactPath('/creator') },
  { path: '/my-ais', expectedUrl: exactPath('/my-ais') },
  { path: '/admin/create-user', expectedUrl: exactPath('/admin/create-user') },
  { path: '/admin/portal', expectedUrl: exactPath('/admin/portal') },
  { path: '/beyond-modules', expectedUrl: exactPath('/beyond-modules') },
  { path: '/dark-glass-carousel', expectedUrl: exactPath('/dark-glass-carousel') },
  { path: '/dev/device-check', expectedUrl: exactPath('/dev/device-check') },
  { path: '/insurance/connect', expectedUrl: exactPath('/insurance/connect') },
  { path: '/insurance', expectedUrl: exactPath('/insurance') },
  { path: '/memorial-services', expectedUrl: exactPath('/memorial-services') },
  { path: '/career', expectedUrl: exactPath('/career') },
  { path: '/career/public/demo-token', expectedUrl: exactPath('/career/public/demo-token') },
];

const redirectAndDeepLinkRoutes: RouteExpectation[] = [
  { path: '/raphael-prototype', expectedUrl: /\/health-dashboard$/ },
  { path: '/raphael', expectedUrl: /\/health-dashboard$/ },
  { path: '/michael-dashboard', expectedUrl: /\/security-dashboard$/ },
  { path: '/saints', expectedUrl: /\/dashboard$/ },
  { path: '/emergency', expectedUrl: /\/health-dashboard#emergency$/ },
  { path: '/files', expectedUrl: /\/health-dashboard#documents$/ },
  { path: '/my-files', expectedUrl: /\/health-dashboard#documents$/ },
  { path: '/oauth/callback', expectedUrl: exactPath('/oauth/callback') },
  { path: '/setup/terra', expectedUrl: exactPath('/setup/terra') },
  { path: '/terra/return', expectedUrl: exactPath('/terra/return') },
];

async function auditRoutes(routes: RouteExpectation[], pageLabel: string, page: Page) {
  for (const route of routes) {
    await test.step(`${pageLabel} ${route.path}`, async () => {
      const errors = collectClientErrors(page);
      await page.goto(route.path);
      await expect(page).toHaveURL(route.expectedUrl);
      await expectRouteToRender(page);
      await expectNoClientErrors(errors, route.path);
    });
  }
}

test.describe('Browser Route Audit', () => {
  test('public auth routes render cleanly', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== 'chromium', 'Full route audit runs in desktop Chromium.');

    await clearDemoMode(page);
    await auditRoutes(publicRoutes, 'public', page);
  });

  test('protected routes enforce auth when demo mode is off', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== 'chromium', 'Full route audit runs in desktop Chromium.');

    await clearDemoMode(page);

    for (const path of ['/dashboard', '/health-dashboard', '/security-dashboard']) {
      await test.step(`redirect ${path}`, async () => {
        const errors = collectClientErrors(page);
        await page.goto(path);
        await expect(page).toHaveURL(/\/login$/);
        await expectRouteToRender(page);
        await expectNoClientErrors(errors, path);
      });
    }
  });

  test('core protected routes render in demo mode', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== 'chromium', 'Full route audit runs in desktop Chromium.');

    await enableDemoMode(page);
    await auditRoutes(coreProtectedRoutes, 'core', page);
  });

  test('non-core routes render in demo mode when the audit flag is enabled', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== 'chromium', 'Full route audit runs in desktop Chromium.');

    await enableDemoMode(page);
    await auditRoutes(nonCoreRoutes, 'non-core', page);
  });

  test('redirects and deep links land on the expected destinations', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== 'chromium', 'Full route audit runs in desktop Chromium.');

    await enableDemoMode(page);
    await auditRoutes(redirectAndDeepLinkRoutes, 'redirect', page);
  });
});
