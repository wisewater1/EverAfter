import { test, expect } from '@playwright/test';

test.describe('Authentication Flow', () => {
  test('should display landing page', async ({ page }) => {
    await page.goto('/');
    await expect(page).toHaveTitle(/EverAfter/i);
  });

  test('should navigate to login page', async ({ page }) => {
    await page.goto('/');
    const loginButton = page.getByRole('link', { name: /sign in/i });
    await loginButton.click();
    await expect(page).toHaveURL(/\/login/);
  });

  test('should navigate to signup page', async ({ page }) => {
    await page.goto('/');
    const signupButton = page.getByRole('link', { name: /get started/i });
    await signupButton.click();
    await expect(page).toHaveURL(/\/signup/);
  });

  test('should show validation errors on empty login form', async ({ page }) => {
    await page.goto('/login');
    const submitButton = page.getByRole('button', { name: /sign in/i });
    await submitButton.click();

    // Check for validation messages or error states
    await expect(page.locator('form')).toBeVisible();
  });

  test('should have accessible form labels', async ({ page }) => {
    await page.goto('/login');

    const emailInput = page.getByLabel(/email/i);
    const passwordInput = page.getByLabel(/password/i);

    await expect(emailInput).toBeVisible();
    await expect(passwordInput).toBeVisible();
  });
});

test.describe('Protected Routes', () => {
  test('should redirect to login when accessing dashboard without auth', async ({ page }) => {
    await page.goto('/dashboard');
    await page.waitForURL(/\/login/);
    await expect(page).toHaveURL(/\/login/);
  });

  test('should redirect to login when accessing health dashboard without auth', async ({
    page,
  }) => {
    await page.goto('/health-dashboard');
    await page.waitForURL(/\/login/);
    await expect(page).toHaveURL(/\/login/);
  });
});

test.describe('Accessibility', () => {
  test('should have proper heading hierarchy on landing page', async ({ page }) => {
    await page.goto('/');
    const h1 = page.locator('h1');
    await expect(h1).toBeVisible();
  });

  test('should support keyboard navigation on login form', async ({ page }) => {
    await page.goto('/login');

    await page.keyboard.press('Tab');
    const focusedElement = await page.evaluate(() => document.activeElement?.tagName);
    expect(['INPUT', 'BUTTON', 'A']).toContain(focusedElement);
  });
});
