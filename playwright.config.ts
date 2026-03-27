import { defineConfig, devices } from '@playwright/test';
import path from 'path';

/**
 * See https://playwright.dev/docs/test-configuration.
 */
export default defineConfig({
  testDir: './tests',
  testMatch: ['**/*.spec.ts', '**/*.setup.ts'],
  /* Maximum time one test can run for. */
  timeout: 30 * 1000,
  expect: {
    /**
     * Maximum time expect() should wait for the condition to be met.
     * For example in `await expect(locator).toBeVisible();`
     */
    timeout: 5000
  },
  /* Run tests in files in parallel */
  fullyParallel: true,
  /* Fail the build on CI if you accidentally left test.only in the source code. */
  forbidOnly: !!process.env.CI,
  /* Retry on CI only */
  retries: process.env.CI ? 2 : 0,
  /* Opt out of parallel tests on CI. */
  workers: process.env.CI ? 1 : undefined,
  /* Reporter to use. See https://playwright.dev/docs/test-reporters */
  reporter: 'html',
  /* Shared settings for all the projects below. See https://playwright.dev/docs/api/class-testoptions. */
  use: {
    /* Base URL to use in actions like `await page.goto('/')`. */
    baseURL: process.env.BASE_URL || process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:3004',

    /* Collect trace when retrying the failed test. See https://playwright.dev/docs/trace-viewer */
    trace: 'retain-on-failure',

    video: 'off',
    screenshot: 'only-on-failure',

    headless: true,
    browserName: 'chromium',
  },

  /* Configure projects for major browsers */
  projects: [
    {
      name: 'auth-setup',
      testMatch: '**/auth.setup.ts',
      use: { ...devices['Desktop Chrome'] },
      // auth-setup does NOT use storageState - it CREATES it
    },
    {
      name: 'chromium',
      testMatch: ['**/canonical-diagnostic.spec.ts', '**/ingest-pdf.spec.ts'],
      use: {
        ...devices['Desktop Chrome'],
        // chromium tests reuse storageState - MUST be inside use{}
        storageState: path.resolve(__dirname, '.auth/user.json'),
      },
      // Run auth-setup first
      dependencies: ['auth-setup'],
    },
  ],

  /* Dev server expected to already be running on 3004 locally */
  // Disabled to reuse existing server without forcing restarts
  webServer: undefined,
});
