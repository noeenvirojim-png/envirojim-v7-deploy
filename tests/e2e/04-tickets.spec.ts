
import { test, expect } from '@playwright/test';
import { ConsoleCollector, NetworkCollector, TEST_CREDENTIALS, login } from './fixtures';

test.describe('Ticket Management Flow', () => {

    test.beforeEach(async ({ page }) => {
        await login(page, TEST_CREDENTIALS.super);
    });

    test('Create Ticket for Existing Machine', async ({ page }) => {
        const col = new ConsoleCollector();
        col.attach(page);

        console.log('--- STARTING TICKET CREATE TEST ---');

        // 1. Navigate to Ticket Create Page
        await page.goto('/dashboard/tickets/create', { timeout: 30000 });
        await expect(page.getByRole('heading', { name: 'Nouveau Ticket' })).toBeVisible();

        // 2. Select Machine
        // Wait for select to be populated
        const machineSelect = page.locator('select#machine');
        await expect(machineSelect).toBeVisible();

        // Get options (skip placeholder)
        const options = await machineSelect.locator('option').all();
        // Option 0 is "Sélectionner une machine"
        if (options.length < 2) {
            throw new Error('No machines available to create ticket');
        }

        // Select first valid machine
        const firstMachineValue = await options[1].getAttribute('value');
        if (!firstMachineValue) throw new Error('Machine option has no value');

        await machineSelect.selectOption(firstMachineValue);

        // 3. Fill Details
        const timestamp = Date.now();
        const ticketTitle = `E2E Test Ticket ${timestamp}`;

        await page.fill('input#title', ticketTitle);
        await page.fill('textarea#description', 'This is an automated test ticket created by Playwright.');
        await page.selectOption('select#priority', 'HIGH');

        // 4. Submit
        const submitBtn = page.getByRole('button', { name: 'Ouvrir le Ticket' });
        await submitBtn.click();

        // 5. Verify Redirect
        await page.waitForURL('**/dashboard/tickets', { timeout: 30000 });
        console.log('✅ Ticket Created and Redirected');

        // 6. Verify in List
        await expect(page.getByText(ticketTitle)).toBeVisible();
        console.log(`✅ Ticket ${ticketTitle} found in list`);

        const errors = col.getErrors();
        if (errors.length > 0) console.error('Console Errors:', errors);
        expect(errors.length).toBe(0);
    });
});
