import { test, expect } from '@playwright/test';

// ============================================================================
// LOGIN FLOW FIX VERIFICATION TEST
// ============================================================================
// Objective: Verify login flow now works with Route Handler approach
// Test that cookies are set and user can access dashboard
// ============================================================================

const TEST_USER = {
    email: 'noe@envirojim.com',
    password: 'EnviroJim2024!'
};

const BASE_URL = 'http://localhost:3000';

test.describe('Login Flow Fix Verification', () => {

    test('Login sets cookies and redirects to dashboard', async ({ page, context }) => {
        // Navigate to login page
        await page.goto(`${BASE_URL}/login`);

        // Verify login page loads
        await expect(page.locator('input[name="email"]')).toBeVisible();
        await expect(page.locator('input[name="password"]')).toBeVisible();

        // Fill login form
        await page.fill('input[name="email"]', TEST_USER.email);
        await page.fill('input[name="password"]', TEST_USER.password);

        // Submit form
        await page.click('button[type="submit"]');

        // Wait for redirect to dashboard
        await page.waitForURL(/dashboard/, { timeout: 10000 });

        // Verify we're on dashboard
        expect(page.url()).toContain('/dashboard');

        // Verify cookies are set
        const cookies = await context.cookies();
        const authCookies = cookies.filter(c => c.name.includes('sb-'));

        console.log('Auth cookies found:', authCookies.length);
        expect(authCookies.length).toBeGreaterThan(0);

        // Verify dashboard content loads
        await expect(page.locator('h1')).toContainText('Dashboard');

        // Screenshot for evidence
        await page.screenshot({ path: 'audit_screenshots/login_fix_success.png', fullPage: true });
    });

    test('Dashboard is accessible after login', async ({ page }) => {
        // Login first
        await page.goto(`${BASE_URL}/login`);
        await page.fill('input[name="email"]', TEST_USER.email);
        await page.fill('input[name="password"]', TEST_USER.password);
        await page.click('button[type="submit"]');
        await page.waitForURL(/dashboard/, { timeout: 10000 });

        // Verify dashboard elements
        const mainContent = page.locator('main, [role="main"], .space-y-8').first();
        await expect(mainContent).toBeVisible();

        // Verify user name is displayed
        await expect(page.locator('text=/Welcome back/')).toBeVisible();

        // Screenshot
        await page.screenshot({ path: 'audit_screenshots/dashboard_after_login.png', fullPage: true });
    });

    test('Protected routes redirect to login when not authenticated', async ({ page, context }) => {
        // Clear all cookies
        await context.clearCookies();

        // Try to access dashboard directly
        await page.goto(`${BASE_URL}/dashboard`);

        // Should redirect to login
        await page.waitForURL(/login/, { timeout: 5000 });
        expect(page.url()).toContain('/login');
    });
});
