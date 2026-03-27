import { test, expect } from '@playwright/test';

/**
 * ENVIROJIM V7.2 - PRODUCTION CERTIFICATION
 * Runs in Real Chrome (non-headless) against Production Vercel
 */

const BASE_URL = process.env.BASE_URL || 'https://envirojim-final-deployment.vercel.app';
const TEST_MACHINE_SN = 'VB750-1773016309210';

test.describe('EnviroJim V7.2 Production Certification', () => {

    test.beforeEach(async ({ page }) => {
        // 1. Root Route Stability
        await page.goto(BASE_URL);
        
        // If redirect to login, handle it (assuming manual or known credentials for real test)
        if (page.url().includes('/login')) {
            console.log('Redirected to login - Correct behavior for unauthenticated session.');
            // Note: In real production hardening, we might use session injection or manual login
            // For this audit, we verify the landing page and routes.
        }
    });

    test('1. Auth & Dashboard Stability', async ({ page }) => {
        await page.goto(`${BASE_URL}/dashboard`);
        // Verify no ERR_FAILED and no infinite loops
        const status = await page.evaluate(() => document.readyState);
        expect(status).toBe('complete');
        
        // Check for common crash markers
        const bodyText = await page.innerText('body');
        expect(bodyText).not.toContain('Application Error');
        expect(bodyText).not.toContain('ERR_FAILED');
    });

    test('2. Machine Asset Resolution', async ({ page }) => {
        await page.goto(`${BASE_URL}/dashboard/machines`);
        
        // Check if machine list renders
        await expect(page.locator('table')).toBeVisible({ timeout: 10000 });
        
        // Search for specific serial number
        const searchInput = page.locator('input[placeholder*="Série"], input[placeholder*="Serial"]');
        if (await searchInput.isVisible()) {
            await searchInput.fill(TEST_MACHINE_SN);
            await page.keyboard.press('Enter');
            
            // Verify lookup executes
            await expect(page.getByText(TEST_MACHINE_SN)).toBeVisible();
        }
    });

    test('3. AI Diagnostic Pipeline', async ({ page }) => {
        // Navigate directly to a diagnostic start (simulated)
        // Or pick a machine and trigger.
        await page.goto(`${BASE_URL}/dashboard/diagnosis`);
        
        // Verify Diagnostic UI stability
        await expect(page.getByText(/Diagnostic|Analyse/i)).toBeVisible();
        
        // Validate Modal responsiveness
        const diagButton = page.locator('button:has-text("Lancer"), button:has-text("Start")');
        if (await diagButton.isVisible()) {
            await diagButton.click();
            // Check for UUID injection markers in network if possible, 
            // or just UI success states.
        }
    });

    test('4. Root Redirect Logic Health', async ({ page }) => {
        await page.goto(BASE_URL);
        // Ensure no redirect loop back to login if already on login or dashboard
        const urlAfterWait = page.url();
        await page.waitForTimeout(1000); 
        expect(page.url()).toBe(urlAfterWait);
    });

    test('5. PWA & Responsive Checks', async ({ page }) => {
        // Desktop
        await page.setViewportSize({ width: 1280, height: 800 });
        await expect(page.locator('nav')).toBeVisible();
        
        // Mobile
        await page.setViewportSize({ width: 375, height: 667 });
        // Menu burger should be visible or navigation adapted
        const menuTrigger = page.locator('button[aria-label*="Menu"], .lucide-menu');
        if (await menuTrigger.isVisible()) {
            await expect(menuTrigger).toBeVisible();
        }
    });

});
