
import { test, expect } from '@playwright/test';
import { TEST_CREDENTIALS, login } from './fixtures';

test.describe('Debug Tickets & Procurement', () => {

    test('Debug Ticket Creation Machine Options', async ({ page }) => {
        await login(page, TEST_CREDENTIALS.manager);

        await page.goto('/dashboard/tickets/create');
        await page.waitForTimeout(1000);

        // Check machine options
        const machineSelect = page.locator('select[name="machineId"], #machine');
        const options = await machineSelect.locator('option').allInnerTexts();
        console.log('Machine Options found:', options);

        if (options.length > 1) { // >1 because first is "Select..."
            console.log('Success: Machines available for selection.');
            // Try selecting
            await machineSelect.selectOption({ index: 1 });
            console.log('Selected option index 1');
        } else {
            console.error('Error: No machines found in dropdown!');
            // Take screenshot to see what's happening
            await page.screenshot({ path: 'test-results/debug-ticket-no-machines.png' });
        }
    });

    test('Debug Procurement URL', async ({ page }) => {
        await login(page, TEST_CREDENTIALS.manager);

        console.log('Navigating to /dashboard/inventory...');
        const response = await page.goto('/dashboard/inventory');
        console.log(`Inventory Status: ${response?.status()}`);

        if (response?.status() === 404) {
            console.error('Inventory 404!');
        } else {
            console.log('Inventory loaded.');
            // Check for Create button
            const createBtn = page.locator('button:has-text("Create"), a:has-text("Create")').first();
            if (await createBtn.count() > 0) {
                console.log('Create button found on inventory page.');
            } else {
                console.log('Create button NOT found on inventory page.');
            }
        }
    });

});
