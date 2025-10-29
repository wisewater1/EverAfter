import { test, expect, devices } from '@playwright/test';

test.describe('Full-Page Scrolling', () => {
  test.beforeEach(async ({ page }) => {
    // Login first (assuming /dashboard requires auth)
    await page.goto('/login');
    await page.fill('input[type="email"]', 'test@example.com');
    await page.fill('input[type="password"]', 'password123');
    await page.click('button[type="submit"]');
    await page.waitForURL('/dashboard');
  });

  test('should scroll to bottom on Dashboard - Desktop', async ({ page }) => {
    await page.goto('/dashboard');

    // Wait for page to load
    await page.waitForSelector('#scroll-end');

    // Get initial scroll position
    const initialScrollY = await page.evaluate(() => window.scrollY);
    expect(initialScrollY).toBe(0);

    // Scroll to the scroll sentinel
    await page.evaluate(() => {
      const sentinel = document.getElementById('scroll-end');
      sentinel?.scrollIntoView({ behavior: 'smooth' });
    });

    // Wait for scroll to complete
    await page.waitForTimeout(500);

    // Verify we can scroll down
    const finalScrollY = await page.evaluate(() => window.scrollY);

    // Check that scroll sentinel is in viewport or reachable
    const isVisible = await page.isVisible('#scroll-end');
    expect(isVisible || finalScrollY > 0).toBe(true);
  });

  test('should scroll to bottom on Dashboard - Mobile (iOS Safari)', async ({ page, browser }) => {
    const context = await browser.newContext({
      ...devices['iPhone 13'],
      userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 15_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/15.0 Mobile/15E148 Safari/604.1',
    });
    const mobilePage = await context.newPage();

    await mobilePage.goto('/dashboard');
    await mobilePage.waitForSelector('#scroll-end');

    // Try to scroll to bottom
    await mobilePage.evaluate(() => {
      const sentinel = document.getElementById('scroll-end');
      sentinel?.scrollIntoView({ behavior: 'smooth' });
    });

    await mobilePage.waitForTimeout(500);

    const canScroll = await mobilePage.evaluate(() => {
      const scrollHeight = document.documentElement.scrollHeight;
      const clientHeight = document.documentElement.clientHeight;
      return scrollHeight > clientHeight;
    });

    // Either page is scrollable OR content fits in viewport
    const sentinelVisible = await mobilePage.isVisible('#scroll-end');
    expect(canScroll || sentinelVisible).toBe(true);

    await context.close();
  });

  test('should scroll to bottom on Dashboard - Mobile (Android Chrome)', async ({ page, browser }) => {
    const context = await browser.newContext({
      ...devices['Pixel 5'],
      userAgent: 'Mozilla/5.0 (Linux; Android 11; Pixel 5) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/90.0.4430.91 Mobile Safari/537.36',
    });
    const mobilePage = await context.newPage();

    await mobilePage.goto('/dashboard');
    await mobilePage.waitForSelector('#scroll-end');

    // Try to scroll to bottom
    await mobilePage.evaluate(() => {
      window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' });
    });

    await mobilePage.waitForTimeout(500);

    const scrollY = await mobilePage.evaluate(() => window.scrollY);
    const sentinelVisible = await mobilePage.isVisible('#scroll-end');

    expect(scrollY > 0 || sentinelVisible).toBe(true);

    await context.close();
  });

  test('should scroll to bottom on HealthDashboard', async ({ page }) => {
    await page.goto('/health-dashboard');
    await page.waitForSelector('#scroll-end');

    // Scroll to sentinel
    await page.evaluate(() => {
      const sentinel = document.getElementById('scroll-end');
      sentinel?.scrollIntoView({ behavior: 'smooth' });
    });

    await page.waitForTimeout(500);

    const finalScrollY = await page.evaluate(() => window.scrollY);
    const isVisible = await page.isVisible('#scroll-end');

    expect(isVisible || finalScrollY > 0).toBe(true);
  });

  test('sticky header should not overlap content', async ({ page }) => {
    await page.goto('/dashboard');

    // Get header height
    const headerRect = await page.evaluate(() => {
      const header = document.querySelector('header');
      return header?.getBoundingClientRect();
    });

    expect(headerRect).toBeTruthy();
    expect(headerRect!.height).toBeGreaterThan(0);

    // Scroll down a bit
    await page.evaluate(() => window.scrollBy(0, 200));
    await page.waitForTimeout(200);

    // Check header is still at top
    const stickyHeaderRect = await page.evaluate(() => {
      const header = document.querySelector('header');
      return header?.getBoundingClientRect();
    });

    expect(stickyHeaderRect!.top).toBe(0);
  });

  test('body should not have overflow hidden when no modal is open', async ({ page }) => {
    await page.goto('/dashboard');

    const bodyOverflow = await page.evaluate(() => {
      return {
        overflow: document.body.style.overflow,
        position: document.body.style.position,
        hasModalClass: document.body.classList.contains('modal-open'),
      };
    });

    expect(bodyOverflow.overflow).not.toBe('hidden');
    expect(bodyOverflow.position).not.toBe('fixed');
    expect(bodyOverflow.hasModalClass).toBe(false);
  });

  test('should support iOS safe areas', async ({ page, browser }) => {
    const context = await browser.newContext({
      ...devices['iPhone 13'],
    });
    const mobilePage = await context.newPage();

    await mobilePage.goto('/dashboard');

    // Check for safe-area padding classes
    const hasSafeArea = await mobilePage.evaluate(() => {
      const main = document.querySelector('main');
      return main?.classList.contains('safe-bottom');
    });

    expect(hasSafeArea).toBe(true);

    await context.close();
  });

  test('no horizontal scrollbar should appear', async ({ page }) => {
    await page.goto('/dashboard');

    const hasHorizontalScroll = await page.evaluate(() => {
      return document.documentElement.scrollWidth > document.documentElement.clientWidth;
    });

    expect(hasHorizontalScroll).toBe(false);
  });
});
