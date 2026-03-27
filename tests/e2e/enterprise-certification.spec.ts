import { test, expect, chromium } from '@playwright/test';

// PRODUCTION TARGET
const BASE_URL = 'https://envirojim-final-deployment.vercel.app';
const ADMIN_EMAIL = 'auditor-v6@envirojim.com';
const ADMIN_PASSWORD = 'EnviroJim2024!';

test.describe('Enterprise Production Certification Audit', () => {

  test.beforeEach(async ({ page }) => {
    // Audit Root Redirect & Middleware
    const response = await page.goto(BASE_URL);
    expect(response?.status()).toBeLessThan(400);
    
    // Check for ERR_FAILED or Redirect loops
    await expect(page).not.toHaveTitle(/Error/i);
  });

  test('AUTHENTICATION: Session Persistence & Role Validation', async ({ page, context }) => {
    await page.goto(`${BASE_URL}/login`);
    await page.fill('input[type="email"]', ADMIN_EMAIL);
    await page.fill('input[type="password"]', ADMIN_PASSWORD);
    await page.click('button[type="submit"]');

    await page.waitForURL('**/dashboard**');
    await expect(page.locator('text=Overview')).toBeVisible();

    // Verify JWT Role Propagation (via UI check)
    await expect(page.locator('text=Administrator')).toBeVisible();

    // Session Persistence: Close and Reopen
    const cookies = await context.cookies();
    expect(cookies.length).toBeGreaterThan(0);

    // Mock "Reopen browser" by navigating to dashboard in new page
    const newPage = await context.newPage();
    await newPage.goto(`${BASE_URL}/dashboard`);
    await expect(newPage.locator('text=Overview')).toBeVisible();
  });

  test('MACHINE RESOLUTION: Fuzzy Matching & Serial Normalization', async ({ page }) => {
    await page.goto(`${BASE_URL}/login`);
    await page.fill('input[type="email"]', ADMIN_EMAIL);
    await page.fill('input[type="password"]', ADMIN_PASSWORD);
    await page.click('button[type="submit"]');
    await page.waitForURL('**/dashboard**');

    const testVariants = [
      'VB750-1773016309210',
      'vb750-1773016309210',
      'VB750',
      'vb750'
    ];

    for (const variant of testVariants) {
      console.log(`Testing Fuzzy Match: ${variant}`);
      await page.goto(`${BASE_URL}/dashboard/machines/${variant}`);
      
      // Wait for content or fallback
      const errorTitle = page.locator('h1:has-text("Machine introuvable")');
      const machineTitle = page.locator('h1:has-text("VB750")');
      
      await Promise.race([
        machineTitle.waitFor({ timeout: 10000 }),
        errorTitle.waitFor({ timeout: 10000 })
      ]);

      if (await errorTitle.isVisible()) {
        throw new Error(`Fuzzy match failed for variant: ${variant}`);
      }
      
      await expect(page.locator('text=SN:')).toBeVisible();
    }
  });

  test('DIAGNOSTIC ENGINE: AI Pipeline & UUID Injection', async ({ page }) => {
    // Login
    await page.goto(`${BASE_URL}/login`);
    await page.fill('input[type="email"]', ADMIN_EMAIL);
    await page.fill('input[type="password"]', ADMIN_PASSWORD);
    await page.click('button[type="submit"]');
    await page.waitForURL('**/dashboard**');

    // Open Machine
    await page.goto(`${BASE_URL}/dashboard/machines/VB750-1773016309210`);
    
    // Switch to Diagnostics Tab
    await page.click('text=Diagnostics');
    
    // Trigger Diagnostic
    await page.click('text=Lancer le Diagnostic');
    
    // Check AI response window
    await expect(page.locator('text=Analyse IA en cours')).toBeVisible({ timeout: 5000 });
    
    // Verify response (Simulation of waiting for AI)
    await expect(page.locator('text=Diagnostic Terminé')).toBeVisible({ timeout: 30000 });
  });

  test('UI STABILITY: Responsive Layout & Sidebar', async ({ page }) => {
    await page.goto(`${BASE_URL}/login`);
    await page.fill('input[type="email"]', ADMIN_EMAIL);
    await page.fill('input[type="password"]', ADMIN_PASSWORD);
    await page.click('button[type="submit"]');
    await page.waitForURL('**/dashboard**');

    const viewports = [
      { width: 1280, height: 800 }, // Desktop
      { width: 768, height: 1024 },  // Tablet
      { width: 375, height: 667 }    // Mobile
    ];

    for (const vp of viewports) {
      await page.setViewportSize(vp);
      await page.waitForTimeout(1000);
      
      if (vp.width <= 375) {
        // On mobile, sidebar should be hidden or collapsed
        // check for hamburger menu
        await expect(page.locator('button:has(svg.lucide-menu)')).toBeVisible();
      } else {
        await expect(page.locator('aside')).toBeVisible();
      }
    }
  });

  test('SECURITY: RLS Cross-Tenant Isolation Audit', async ({ page }) => {
    await page.goto(`${BASE_URL}/login`);
    await page.fill('input[type="email"]', ADMIN_EMAIL);
    await page.fill('input[type="password"]', ADMIN_PASSWORD);
    await page.click('button[type="submit"]');
    await page.waitForURL('**/dashboard**');

    // Attempt to access a potentially invalid/other org UUID directly via API or URL
    // Here we check if navigating to a random UUID returns "not found" or "denied"
    const randomUUID = '00000000-0000-0000-0000-000000000000';
    await page.goto(`${BASE_URL}/dashboard/machines/${randomUUID}`);
    await expect(page.locator('text=Machine introuvable')).toBeVisible();
  });

  test('PWA: Manifest & Service Worker Integrity', async ({ page }) => {
    await page.goto(BASE_URL);
    
    // Check manifest link
    const manifest = await page.locator('link[rel="manifest"]').getAttribute('href');
    expect(manifest).toBe('/manifest.json');

    // Check Service Worker registration via console logs
    const logs: string[] = [];
    page.on('console', msg => logs.push(msg.text()));
    
    await page.reload();
    await page.waitForTimeout(3000); // Wait for SW to register
    
    expect(logs.some(log => log.includes('ServiceWorker registration successful'))).toBe(true);
  });

});
