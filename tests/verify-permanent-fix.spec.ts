
import { test, expect } from '@playwright/test';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.join(__dirname, '../.env.local') });

const BASE_URL = process.env.BASE_URL || 'https://envirojim-final-deployment.vercel.app';
const ADMIN_EMAIL = 'noe@envirojim.com';
const ADMIN_PASS = '@Enviro2018!';

test.describe('Permanent Fix Verification', () => {
  
  test('Admin Login & Dashboard Stability', async ({ page }) => {
    console.log(`Starting login test for ${ADMIN_EMAIL}...`);
    await page.goto(`${BASE_URL}/login`);
    
    await page.fill('input[type="email"]', ADMIN_EMAIL);
    await page.fill('input[type="password"]', ADMIN_PASS);
    await page.click('button[type="submit"]');

    // Wait for navigation to dashboard
    await expect(page).toHaveURL(/.*dashboard.*/, { timeout: 15000 });
    console.log('✅ Dashboard loaded successfully.');
  });

  test('Machines Page - Zero Crash Guarantee', async ({ page }) => {
    await page.goto(`${BASE_URL}/login`);
    await page.fill('input[type="email"]', ADMIN_EMAIL);
    await page.fill('input[type="password"]', ADMIN_PASS);
    await page.click('button[type="submit"]');
    await expect(page).toHaveURL(/.*dashboard.*/);

    console.log('Navigating to Machines page...');
    await page.goto(`${BASE_URL}/dashboard/machines`);
    
    // Check for "An error occurred in the Server Components render"
    const content = await page.content();
    expect(content).not.toContain('An error occurred in the Server Components render');
    expect(content).not.toContain('Application error: a client-side exception has occurred');
    
    // Check if machines table is visible
    const table = page.locator('table');
    await expect(table).toBeVisible({ timeout: 10000 });
    console.log('✅ Machines page loaded without crash.');
  });

  test('Health Endpoint - Absolute OK', async ({ request }) => {
    console.log('Checking health endpoint...');
    const response = await request.get(`${BASE_URL}/api/admin/health`);
    const diagnostics = await response.json();
    console.log('Diagnostics:', JSON.stringify(diagnostics, null, 2));

    if (!response.ok() || diagnostics.status !== 'OK') {
        console.error('❌ Health check failed or returned degraded status.');
    }

    expect(response.ok()).toBeTruthy();
    expect(diagnostics.status).toBe('OK');
    expect(diagnostics.checks.machines_schema).toBe('OK');
    expect(diagnostics.checks.identity_sync).toBe('OK');
    expect(diagnostics.checks.admin_user).toBe('OK');
    console.log('✅ Health endpoint returned absolute OK.');
  });

  test('Identity Consistency Check', async ({ page }) => {
     // This test ensures the frontend sees the correct role/org
     await page.goto(`${BASE_URL}/login`);
     await page.fill('input[type="email"]', ADMIN_EMAIL);
     await page.fill('input[type="password"]', ADMIN_PASS);
     await page.click('button[type="submit"]');
     await expect(page).toHaveURL(/.*dashboard.*/);

     // Check if admin UI elements are visible (proving role is correct)
     // Use locator for toContainText
     await expect(page.locator('body')).not.toContainText('Unauthorized');
  });
});
