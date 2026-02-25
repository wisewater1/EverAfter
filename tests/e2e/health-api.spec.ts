import { test, expect } from '@playwright/test';

test.describe('Health API Onboarding Flow', () => {
    test('should navigate through health onboarding steps', async ({ page }) => {
        // Mock the session/user if possible, or assume a test environment where we can bypass login
        // For now, we'll verify the presence of the health connection step
        await page.goto('/onboarding');

        // We expect to see the welcome step first
        await expect(page.getByText(/Welcome to EverAfter/i)).toBeVisible();

        // Click Get Started
        await page.getByRole('button', { name: /get started/i }).click();

        // Meet Raphael Step
        await expect(page.getByText(/Meet St. Raphael/i)).toBeVisible();
        await page.getByRole('button', { name: /continue/i }).click();

        // Health Profile Step
        await expect(page.getByText(/Your Health Profile/i)).toBeVisible();
        await page.getByRole('button', { name: /continue/i }).click();

        // Health Connection Step
        await expect(page.getByText(/Connect Your Health Data/i)).toBeVisible();

        // Verify common providers are listed
        await expect(page.getByText(/Apple Health/i)).toBeVisible();
        await expect(page.getByText(/Fitbit/i)).toBeVisible();
        await expect(page.getByText(/Google Fit/i)).toBeVisible();

        // Click Skip for now (since we haven't connected any)
        await page.getByRole('button', { name: /skip for now/i }).click();

        // Media Permissions Step
        await expect(page.getByText(/Media & Documentation/i)).toBeVisible();
    });
});
