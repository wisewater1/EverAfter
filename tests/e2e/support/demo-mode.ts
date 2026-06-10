import { ConsoleMessage, expect, Page } from '@playwright/test';

const DEMO_AUTH_KEY = 'everafter_demo_auth';
const IGNORED_ERROR_PATTERNS = [
  /favicon\.ico/i,
  /interactive-widget/i,
];

export function collectClientErrors(page: Page) {
  const errors: string[] = [];

  const pushError = (message: string) => {
    if (!IGNORED_ERROR_PATTERNS.some((pattern) => pattern.test(message))) {
      errors.push(message);
    }
  };

  const onConsole = (message: ConsoleMessage) => {
    if (message.type() === 'error') {
      pushError(message.text());
    }
  };

  const onPageError = (error: Error) => {
    pushError(error.message);
  };

  page.on('console', onConsole);
  page.on('pageerror', onPageError);

  return {
    errors,
    dispose: () => {
      page.off('console', onConsole);
      page.off('pageerror', onPageError);
    },
  };
}

export async function enableDemoMode(page: Page) {
  await page.addInitScript((storageKey: string) => {
    window.localStorage.setItem(storageKey, '1');
  }, DEMO_AUTH_KEY);
}

export async function clearDemoMode(page: Page) {
  await page.addInitScript((storageKey: string) => {
    window.localStorage.removeItem(storageKey);
  }, DEMO_AUTH_KEY);
}

export async function gotoWithDemo(page: Page, path: string) {
  await enableDemoMode(page);
  await page.goto(path);
}

export async function expectRouteToRender(page: Page, minimumCharacters = 24) {
  await page.waitForLoadState('domcontentloaded');

  await expect
    .poll(
      async () => {
        const text = await page.locator('body').evaluate((body) =>
          body.innerText.replace(/\s+/g, ' ').trim(),
        );

        return text.length >= minimumCharacters &&
          !/^loading\.{0,3}$/i.test(text) &&
          !/application error/i.test(text);
      },
      { timeout: 20_000 },
    )
    .toBe(true);
}

export async function expectNoClientErrors(
  collector: { errors: string[]; dispose: () => void },
  context: string,
) {
  collector.dispose();
  expect(collector.errors, `Unexpected browser errors while testing ${context}`).toEqual([]);
}
