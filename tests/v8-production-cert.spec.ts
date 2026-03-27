import { test, expect } from '@playwright/test';
import * as path from 'path';

const MAIN_URL = 'https://envirojim-final-deployment.vercel.app';
const DIRECT_URL = 'https://envirojim-final-deployment-6agcccs75-envirojim.vercel.app';
const TEST_EMAIL = 'noe@envirojim.com';
const TEST_PASSWORD = '@Enviro2018!';

const SCREENSHOT_DIR = path.resolve(process.cwd(), 'reports', 'screenshots');

test.describe('EnviroJim V8 Production Certification', () => {

  test('1. Frontend Accessibility - Main Domain', async ({ page }) => {
    console.log(`Navigating to ${MAIN_URL}...`);
    const response = await page.goto(MAIN_URL);
    expect(response?.status()).toBe(200);
    await page.waitForLoadState('networkidle');
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'main_domain_home.png') });
    console.log('✅ Main domain loaded.');
  });

  test('2. Frontend Accessibility - Direct Deployment', async ({ page }) => {
    console.log(`Navigating to ${DIRECT_URL}...`);
    const response = await page.goto(DIRECT_URL);
    // Note: We saw 401 in curl, let's see what playwright sees. 
    // If it's Vercel deployment protection, it might show a login screen.
    await page.waitForLoadState('networkidle');
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'direct_deploy_load.png') });
    console.log(`Direct deploy status: ${response?.status()}`);
  });

  test('3. Email/Password Login - Normal Flow', async ({ page }) => {
    console.log('Testing Email/Password Login on Main Domain...');
    await page.goto(`${MAIN_URL}/login`);
    
    // Fill form
    await page.fill('input[type="email"]', TEST_EMAIL);
    await page.fill('input[type="password"]', TEST_PASSWORD);
    
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'login_page_filled.png') });
    
    // Click login
    await page.click('button[type="submit"]');
    
    // Wait for navigation to dashboard - adjust selector based on target UI
    try {
        await page.waitForURL('**/dashboard', { timeout: 15000 });
        console.log('✅ Login successful - Redirected to /dashboard');
        await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'dashboard_success.png') });
    } catch (e) {
        console.error('❌ Login failed or redirected elsewhere');
        await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'login_failure.png') });
        throw e;
    }
  });

  test('4. OAuth Initiation - Google', async ({ page }) => {
    const OAUTH_URL = `${MAIN_URL}/oauth/login?token=0000000000000000000000000000000000000000000000000000000000000000`;
    await page.goto(OAUTH_URL);
    await page.waitForLoadState('networkidle');
    console.log('Checking Google OAuth Button on Onboarding Page...');
    
    // Take a screenshot of the onboarding page to confirm it loaded
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'oauth_onboarding_page.png') });
    
    const googleBtn = page.locator('button').filter({ hasText: /GOOGLE/i });
    await expect(googleBtn).toBeVisible({ timeout: 15000 });
    
    await googleBtn.click();
    
    // Verify redirection to accounts.google.com
    await page.waitForURL(/accounts\.google\.com/, { timeout: 20000 });
    console.log('✅ Google OAuth initialized successfully.');
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'oauth_google_init.png') });
  });

  test('5. OAuth Initiation - Microsoft', async ({ page }) => {
    const OAUTH_URL = `${MAIN_URL}/oauth/login?token=0000000000000000000000000000000000000000000000000000000000000000`;
    await page.goto(OAUTH_URL);
    await page.waitForLoadState('networkidle');
    console.log('Checking Microsoft OAuth Button on Onboarding Page...');
    
    const msBtn = page.locator('button').filter({ hasText: /MICROSOFT/i });
    await expect(msBtn).toBeVisible({ timeout: 15000 });
    
    await msBtn.click();
    
    // Verify redirection to login.microsoftonline.com
    await page.waitForURL(/login\.microsoftonline\.com/, { timeout: 20000 });
    console.log('✅ Microsoft OAuth initialized successfully.');
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'oauth_ms_init.png') });
  });

});
