import { test, expect } from '@playwright/test';
import { ConsoleCollector, NetworkCollector, TEST_CREDENTIALS, login } from './fixtures';

test.describe('File Upload and RBAC Tests', () => {

    test('Test 13: File Upload UI Presence (Machine Documents)', async ({ page }) => {
        const collector = new ConsoleCollector();
        collector.attach(page);

        await login(page, TEST_CREDENTIALS.admin);
        await page.goto('/dashboard/machines');

        const createButton = page.locator('button:has-text("Create"), a:has-text("Create")').first();

        if (await createButton.count() > 0) {
            await createButton.click();
            await page.waitForTimeout(1000);

            // Look for file input
            const fileInput = page.locator('input[type="file"]');
            const hasFileUpload = await fileInput.count() > 0;

            console.log(`File upload input present: ${hasFileUpload}`);

            await page.screenshot({ path: 'test-results/screenshots/16-file-upload-ui.png', fullPage: true });
        }

        const errors = collector.getErrors();
        if (errors.length > 0) {
            console.log('File Upload UI Errors:', errors);
        }
    });

    test('Test 14: RBAC - Admin vs Tech UI Differences', async ({ page }) => {
        const collector = new ConsoleCollector();
        collector.attach(page);

        // Login as admin
        await login(page, TEST_CREDENTIALS.admin);
        await page.goto('/dashboard');

        // Capture admin UI
        await page.screenshot({ path: 'test-results/screenshots/17-admin-ui.png', fullPage: true });

        // Count admin-specific elements
        const adminButtons = await page.locator('button, a').count();
        console.log(`Admin UI elements: ${adminButtons}`);

        // Logout
        const logoutButton = page.locator('button:has-text("Logout"), button:has-text("Sign Out"), a:has-text("Logout")').first();
        if (await logoutButton.count() > 0) {
            await logoutButton.click();
            await page.waitForTimeout(1000);
        } else {
            // Manual navigation to logout
            await page.goto('/');
        }

        // Login as tech
        await login(page, TEST_CREDENTIALS.tech);
        await page.goto('/dashboard');

        // Capture tech UI
        await page.screenshot({ path: 'test-results/screenshots/18-tech-ui.png', fullPage: true });

        const techButtons = await page.locator('button, a').count();
        console.log(`Tech UI elements: ${techButtons}`);

        // Compare
        console.log(`UI difference (Admin vs Tech): ${adminButtons - techButtons} elements`);

        const errors = collector.getErrors();
        if (errors.length > 0) {
            console.log('RBAC UI Errors:', errors);
        }
    });

    test('Test 15: Console Error Summary Across All Pages', async ({ page }) => {
        const collector = new ConsoleCollector();
        collector.attach(page);

        await login(page, TEST_CREDENTIALS.admin);

        const pages = [
            '/dashboard',
            '/dashboard/machines',
            '/dashboard/clients',
            '/dashboard/inventory',
            '/dashboard/parts',
            '/dashboard/diagnostics',
            '/dashboard/tickets'
        ];

        const errorSummary: Record<string, string[]> = {};

        for (const pagePath of pages) {
            try {
                await page.goto(pagePath, { timeout: 10000 });
                await page.waitForTimeout(2000);

                const pageErrors = collector.getErrors();
                errorSummary[pagePath] = pageErrors;

                console.log(`${pagePath}: ${pageErrors.length} errors`);
            } catch (error) {
                console.log(`${pagePath}: Navigation failed - ${error}`);
                errorSummary[pagePath] = [`Navigation failed: ${error}`];
            }
        }

        // Final summary
        console.log('\n=== CONSOLE ERROR SUMMARY ===');
        for (const [path, errors] of Object.entries(errorSummary)) {
            console.log(`${path}: ${errors.length} errors`);
            if (errors.length > 0) {
                errors.forEach(err => console.log(`  - ${err}`));
            }
        }
    });
});
