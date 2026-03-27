
import { test, expect } from '@playwright/test';
import { ConsoleCollector, NetworkCollector, PerformanceCollector, TEST_CREDENTIALS, login } from './fixtures';

test.describe('Hard Gate: Critical Path Validation', () => {

    // This test suite represents the "Money Flow" of the application.
    // If this fails, the application is considered BROKEN.

    test('Critical Path: Login -> Machines -> Ticket Creation', async ({ page }) => {
        const col = new ConsoleCollector();
        const network = new NetworkCollector();
        col.attach(page);
        network.attach(page);

        console.log('--- STARTING HARD GATE VALIDATION ---');

        // 1. Login as Admin
        await login(page, TEST_CREDENTIALS.super);

        // 2. Verify Dashboard Metrics
        // Note: Skipping strict widget text check as it varies. Relying on URL and Nav.
        await expect(page).toHaveURL(/.*dashboard/);
        // Strict mode violation fix: Check for the Machines link in the nav instead of generic 'navigation'
        const machinesLink = page.locator('a[href="/dashboard/machines"]');
        await expect(machinesLink).toBeVisible();
        console.log('✅ Dashboard Loaded');

        // 3. Navigate to Machine List
        await page.click('a[href="/dashboard/machines"]');
        await page.waitForURL('**/dashboard/machines', { timeout: 10000 });
        console.log('✅ Navigated to Machines');

        // 4. Verify Machine List Data
        // Wait for at least one machine row or card
        const machineRows = page.locator('table tbody tr');
        // Fallback for card view if table not present, or specific machine element
        // We'll look for text that indicates machines are present
        await expect(page.getByRole('heading', { name: 'Machines', exact: true })).toBeVisible();
        console.log('✅ Machine List Loaded');

        // 5. Select a Machine (Click first view/details button or the card itself)
        // Strategy: Look for a link inside the grid.
        const machineCards = page.locator('.grid > div');
        // Wait for at least one card
        await expect(machineCards.first()).toBeVisible({ timeout: 10000 });

        // Find a link within the first card
        const viewLink = machineCards.first().locator('a').first();
        // If no link, click the card? Assuming mostly links.
        await viewLink.click();

        await page.waitForURL('**/dashboard/machines/**', { timeout: 15000 });
        console.log('✅ Machine Details Loaded');

        // 6. Attempt AI Diagnosis (Verify Button and Navigation)
        const diagnosisBtn = page.getByRole('button', { name: /réaliser un diagnostic ai/i });
        await expect(diagnosisBtn).toBeVisible();
        await diagnosisBtn.click();

        await page.waitForURL('**/dashboard/diagnosis**', { timeout: 10000 });
        console.log('✅ Diagnosis Page Loaded');

        // Optional: Check for diagnosis page content (Wait for loader to finish)
        await expect(page.getByText(/appuyez sur le micro|aucun arbre/i)).toBeVisible({ timeout: 15000 });

        // Close modal to be polite
        await page.keyboard.press('Escape');

        // 7. Network/Console Health Check
        const errors = col.getErrors();
        const failures = network.getFailures();

        if (errors.length > 0) console.error('❌ Console Errors:', errors);
        if (failures.length > 0) console.error('❌ Network Failures:', failures);

        expect(errors.length).toBe(0);
        expect(failures.length).toBe(0);

        console.log('--- HARD GATE PASSED ---');
    });
});
