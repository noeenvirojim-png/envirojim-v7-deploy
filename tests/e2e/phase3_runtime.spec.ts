import { test, expect } from '@playwright/test';

// ============================================================================
// PHASE 3: APP RUNTIME VERIFICATION
// ============================================================================
// Objective: Verify Next.js app runtime, login flow, dashboard access
// Test critical routes and UI elements
// ============================================================================

const TEST_USER = {
    email: 'noe@envirojim.com',
    password: 'EnviroJim2024!'
};

const BASE_URL = 'http://localhost:3000';

test.describe('Phase 3: App Runtime Verification', () => {

    test('1. Login Page Loads', async ({ page }) => {
        await page.goto(`${BASE_URL}/login`);

        // Verify login page elements
        await expect(page).toHaveTitle(/EnviroJim|Login/i);

        // Look for email and password inputs
        const emailInput = page.locator('input[type="email"], input[name="email"]').first();
        const passwordInput = page.locator('input[type="password"], input[name="password"]').first();

        await expect(emailInput).toBeVisible();
        await expect(passwordInput).toBeVisible();

        // Screenshot for evidence
        await page.screenshot({ path: 'audit_screenshots/phase3_01_login_page.png', fullPage: true });
    });

    test('2. Login Flow with Test User', async ({ page }) => {
        await page.goto(`${BASE_URL}/login`);

        // Fill login form
        await page.locator('input[type="email"], input[name="email"]').first().fill(TEST_USER.email);
        await page.locator('input[type="password"], input[name="password"]').first().fill(TEST_USER.password);

        // Submit form (look for submit button or form submission)
        const submitButton = page.locator('button[type="submit"]').first();
        await submitButton.click();

        // Wait for navigation to dashboard
        await page.waitForURL(/dashboard/, { timeout: 10000 });

        // Verify we're on dashboard
        expect(page.url()).toContain('/dashboard');

        // Screenshot for evidence
        await page.screenshot({ path: 'audit_screenshots/phase3_02_post_login.png', fullPage: true });
    });

    test('3. Dashboard UI Elements Exist', async ({ page, context }) => {
        // Login first
        await page.goto(`${BASE_URL}/login`);
        await page.locator('input[type="email"], input[name="email"]').first().fill(TEST_USER.email);
        await page.locator('input[type="password"], input[name="password"]').first().fill(TEST_USER.password);
        await page.locator('button[type="submit"]').first().click();
        await page.waitForURL(/dashboard/, { timeout: 10000 });

        // Verify dashboard elements
        // Look for navigation, header, main content area
        const nav = page.locator('nav, [role="navigation"]').first();
        await expect(nav).toBeVisible();

        // Look for common dashboard elements
        const mainContent = page.locator('main, [role="main"], .dashboard').first();
        await expect(mainContent).toBeVisible();

        // Screenshot for evidence
        await page.screenshot({ path: 'audit_screenshots/phase3_03_dashboard.png', fullPage: true });
    });

    test('4. Navigate to /dashboard/machines', async ({ page }) => {
        // Login
        await page.goto(`${BASE_URL}/login`);
        await page.locator('input[type="email"], input[name="email"]').first().fill(TEST_USER.email);
        await page.locator('input[type="password"], input[name="password"]').first().fill(TEST_USER.password);
        await page.locator('button[type="submit"]').first().click();
        await page.waitForURL(/dashboard/, { timeout: 10000 });

        // Navigate to machines
        await page.goto(`${BASE_URL}/dashboard/machines`);

        // Verify we're on machines page
        expect(page.url()).toContain('/dashboard/machines');

        // Wait for page to load
        await page.waitForLoadState('networkidle');

        // Screenshot for evidence
        await page.screenshot({ path: 'audit_screenshots/phase3_04_machines.png', fullPage: true });
    });

    test('5. Navigate to /dashboard/inventory', async ({ page }) => {
        // Login
        await page.goto(`${BASE_URL}/login`);
        await page.locator('input[type="email"], input[name="email"]').first().fill(TEST_USER.email);
        await page.locator('input[type="password"], input[name="password"]').first().fill(TEST_USER.password);
        await page.locator('button[type="submit"]').first().click();
        await page.waitForURL(/dashboard/, { timeout: 10000 });

        // Navigate to inventory
        await page.goto(`${BASE_URL}/dashboard/inventory`);

        // Verify we're on inventory page
        expect(page.url()).toContain('/dashboard/inventory');

        // Wait for page to load
        await page.waitForLoadState('networkidle');

        // Screenshot for evidence
        await page.screenshot({ path: 'audit_screenshots/phase3_05_inventory.png', fullPage: true });
    });

    test('6. Navigate to /dashboard/diagnosis', async ({ page }) => {
        // Login
        await page.goto(`${BASE_URL}/login`);
        await page.locator('input[type="email"], input[name="email"]').first().fill(TEST_USER.email);
        await page.locator('input[type="password"], input[name="password"]').first().fill(TEST_USER.password);
        await page.locator('button[type="submit"]').first().click();
        await page.waitForURL(/dashboard/, { timeout: 10000 });

        // Navigate to diagnosis
        await page.goto(`${BASE_URL}/dashboard/diagnosis`);

        // Verify we're on diagnosis page
        expect(page.url()).toContain('/dashboard/diagnosis');

        // Wait for page to load
        await page.waitForLoadState('networkidle');

        // Screenshot for evidence
        await page.screenshot({ path: 'audit_screenshots/phase3_06_diagnosis.png', fullPage: true });
    });
});
