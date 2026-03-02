import { defineConfig, devices } from '@playwright/test';

/**
 * Testing Platform — Playwright Configuration Template
 *
 * Copy to your project root as `playwright.config.ts` and customize.
 * See: https://playwright.dev/docs/test-configuration
 */
export default defineConfig({
  testDir: './test/specs',
  outputDir: './test/results',

  /* Fail the build on CI if you accidentally left test.only in the source code */
  forbidOnly: !!process.env.CI,

  /* Retry failed tests once on CI */
  retries: process.env.CI ? 1 : 0,

  /* Single worker for deterministic execution */
  workers: 1,

  /* Reporter: HTML for local, JSON for CI/dashboard consumption */
  reporter: [
    ['html', { outputFolder: './test/results/html-report' }],
    ['json', { outputFile: './test/results/results.json' }],
  ],

  use: {
    /* Base URL — override via BASE_URL env var */
    baseURL: process.env.BASE_URL || 'http://localhost:3000',

    /* Capture trace on first retry */
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

  /* Start your dev server before tests (optional) */
  // webServer: {
  //   command: 'npm run dev',
  //   url: 'http://localhost:3000',
  //   reuseExistingServer: !process.env.CI,
  // },
});
