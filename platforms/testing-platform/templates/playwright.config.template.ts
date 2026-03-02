import { defineConfig, devices } from '@playwright/test';

/**
 * Testing Platform — Playwright Configuration Template
 *
 * Copy this file to your project root as `playwright.config.ts` and customize.
 * See: https://playwright.dev/docs/test-configuration
 */
export default defineConfig({
  testDir: './test',
  testMatch: '**/*.spec.ts',

  /* Maximum time one test can run */
  timeout: 30_000,

  /* Fail the build on CI if you accidentally left test.only in the source code */
  forbidOnly: !!process.env.CI,

  /* Retry on CI only */
  retries: process.env.CI ? 2 : 0,

  /* Reporter */
  reporter: [
    ['html', { outputFolder: './test-results/report' }],
    ['json', { outputFile: './test-results/results.json' }],
  ],

  /* Shared settings for all projects */
  use: {
    /* Base URL — change this to your app's local dev URL */
    baseURL: process.env.TEST_BASE_URL || 'http://localhost:3000',

    /* Collect trace on failure */
    trace: 'on-first-retry',

    /* Screenshot on failure */
    screenshot: 'only-on-failure',
  },

  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],

  /* Run your local dev server before starting tests */
  // webServer: {
  //   command: 'npm run dev',
  //   url: 'http://localhost:3000',
  //   reuseExistingServer: !process.env.CI,
  // },
});
