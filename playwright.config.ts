import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  timeout: 60_000,
  workers: process.env.CI ? 1 : 4,
  reporter: 'html',
  use: {
    baseURL: process.env.BASE_URL || 'http://localhost:5000',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },

  projects: [
    {
      name: 'chromium',
      testIgnore: /mobile-smoke\.spec\.ts/,
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'Mobile Chrome',
      testMatch: /mobile-smoke\.spec\.ts/,
      use: { ...devices['Pixel 5'] },
    },
    {
      name: 'Mobile Safari',
      testMatch: /mobile-smoke\.spec\.ts/,
      use: { ...devices['iPhone 12'] },
    },
  ],

  webServer: [
    {
      command: "powershell -NoProfile -Command \"$env:PORT='3001'; npm run dev:server\"",
      url: 'http://localhost:3001/health',
      reuseExistingServer: !process.env.CI,
      timeout: 120_000,
    },
    {
      command: "powershell -NoProfile -Command \"$env:PORT='8010'; npm run dev\"",
      cwd: './health-api',
      url: 'http://localhost:8010/health',
      reuseExistingServer: !process.env.CI,
      timeout: 120_000,
    },
    {
      command: "powershell -NoProfile -Command \"$env:VITE_ENABLE_NON_CORE_ROUTES='true'; npm run dev\"",
      url: 'http://localhost:5000',
      reuseExistingServer: !process.env.CI,
      timeout: 120_000,
    },
  ],
});
