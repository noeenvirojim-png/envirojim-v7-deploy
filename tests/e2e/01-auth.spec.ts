import { test, expect } from '@playwright/test';
import { ConsoleCollector, NetworkCollector, PerformanceCollector, TEST_CREDENTIALS, login } from './fixtures';

test.describe('Authentication Flow Tests', () => {

    test('Test 1: Admin Login Flow', async ({ page }) => {
        const col = new ConsoleCollector();
        const network = new NetworkCollector();
        const perf = new PerformanceCollector();

        col.attach(page);
        network.attach(page);

        // Navigate to login page
        await page.goto('/login');
        await perf.collect(page);

        // Take screenshot of landing page
        await page.screenshot({ path: 'test-results/screenshots/01-landing-page.png', fullPage: true });

        // Check for login form
        const emailInput = page.locator('input[type="email"]');
        await expect(emailInput).toBeVisible({ timeout: 10000 });

        // Fill login form
        await emailInput.fill(TEST_CREDENTIALS.super.email);
        await page.fill('input[type="password"]', TEST_CREDENTIALS.super.password);

        // Take screenshot before submit
        await page.screenshot({ path: 'test-results/screenshots/02-login-form-filled.png', fullPage: true });

        // Submit form
        await page.click('button[type="submit"]');

        // Wait for dashboard
        await page.waitForURL('**/dashboard**', { timeout: 15000 });

        // Take screenshot of dashboard
        await page.screenshot({ path: 'test-results/screenshots/03-admin-dashboard.png', fullPage: true });

        // Verify dashboard loaded
        await expect(page).toHaveURL(/.*dashboard.*/);

        // Check for console errors
        const errors = col.getErrors();
        if (errors.length > 0) {
            console.log('Console Errors:', errors);
        }

        // Check for network failures
        if (network.hasFailed()) {
            console.log('Network Failures:', network.getFailures());
        }

        console.log('Performance:', perf.getSummary());
    });

    test('Test 2: Tech User Login Flow', async ({ page }) => {
        const col = new ConsoleCollector();
        const network = new NetworkCollector();

        col.attach(page);
        network.attach(page);

        await page.goto('/login');

        const emailInput = page.locator('input[type="email"]');
        await expect(emailInput).toBeVisible({ timeout: 10000 });

        await emailInput.fill(TEST_CREDENTIALS.tech.email);
        await page.fill('input[type="password"]', TEST_CREDENTIALS.tech.password);

        await page.screenshot({ path: 'test-results/screenshots/04-tech-login-form.png', fullPage: true });

        await page.click('button[type="submit"]');
        await page.waitForURL('**/dashboard**', { timeout: 15000 });

        await page.screenshot({ path: 'test-results/screenshots/05-tech-dashboard.png', fullPage: true });

        await expect(page).toHaveURL(/.*dashboard.*/);

        const errors = col.getErrors();
        if (errors.length > 0) {
            console.log('Console Errors (Tech):', errors);
        }
    });

    test('Test 3: Invalid Credentials Handling', async ({ page }) => {
        const col = new ConsoleCollector();
        col.attach(page);

        await page.goto('/login');

        const emailInput = page.locator('input[type="email"]');
        await expect(emailInput).toBeVisible({ timeout: 10000 });

        await emailInput.fill('invalid@test.com');
        await page.fill('input[type="password"]', 'wrongpassword');

        await page.click('button[type="submit"]');

        // Should show error message
        await page.waitForTimeout(2000);

        await page.screenshot({ path: 'test-results/screenshots/06-invalid-login.png', fullPage: true });

        // Should still be on login page
        await expect(page).not.toHaveURL(/.*dashboard.*/);
    });
});
