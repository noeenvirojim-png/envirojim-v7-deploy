import { test as setup } from '@playwright/test';

const BASE_URL = process.env.PLAYWRIGHT_BASE_URL || process.env.BASE_URL || 'http://localhost:3004';
const EMAIL = 'noe@envirojim.com';
const PASSWORD = 'EnviroJim2024!';

setup('authenticate', async ({ page }) => {
  // Navigate to login
  await page.goto(`${BASE_URL}/login`, { waitUntil: 'load' });

  // Fill credentials
  const emailInputs = page.locator('input[type="email"]');
  await emailInputs.first().fill(EMAIL);

  const passwordInputs = page.locator('input[type="password"]');
  await passwordInputs.first().fill(PASSWORD);

  // Submit
  const authButtons = page.locator('button:has-text("Authenticate")');
  await authButtons.first().click();

  // Wait for dashboard
  await page.waitForURL(/dashboard/, { timeout: 30000 });

  // Save auth state for reuse
  await page.context().storageState({ path: '.auth/user.json' });
});
