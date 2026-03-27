import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  timeout: 60 * 1000,
  expect: { timeout: 10000 },
  fullyParallel: false,
  reporter: 'list',
  use: {
    baseURL: 'https://envirojim-final-deployment.vercel.app',
    headless: false,
    screenshot: 'on',
    video: 'on',
  },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
  ],
});
