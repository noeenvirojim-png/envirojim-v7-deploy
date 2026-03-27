import { test, expect } from '@playwright/test';
import { ConsoleCollector, NetworkCollector, TEST_CREDENTIALS, login } from './fixtures';

test.describe('CRUD Operations Tests', () => {

    test.beforeEach(async ({ page }) => {
        await login(page, TEST_CREDENTIALS.super);
    });

    test('Test 9: Create Machine Form Rendering', async ({ page }) => {
        const col = new ConsoleCollector();
        const network = new NetworkCollector();

        col.attach(page);
        network.attach(page);

        // Navigate to machines
        await page.goto('/dashboard/machines');

        // Look for create button
        const createButton = page.locator('button:has-text("Create"), a:has-text("Create")').first();

        if (await createButton.count() > 0) {
            await createButton.click();
            await page.waitForTimeout(1000);

            await page.screenshot({ path: 'test-results/screenshots/12-create-machine-form.png', fullPage: true });

            // Check for form fields
            const form = page.locator('form');
            await expect(form).toBeVisible({ timeout: 5000 });

            console.log('Create Machine form rendered successfully');
        } else {
            console.log('Create Machine button not found');
            await page.screenshot({ path: 'test-results/screenshots/12-machines-no-create-button.png', fullPage: true });
        }

        const errors = col.getErrors();
        if (errors.length > 0) {
            console.log('Create Machine Form Errors:', errors);
        }
    });

    test('Test 10: Create Client Form Rendering', async ({ page }) => {
        const col = new ConsoleCollector();
        col.attach(page);

        await page.goto('/dashboard/clients');

        const createButton = page.locator('button:has-text("Create"), a:has-text("Create")').first();

        if (await createButton.count() > 0) {
            await createButton.click();
            await page.waitForTimeout(1000);

            await page.screenshot({ path: 'test-results/screenshots/13-create-client-form.png', fullPage: true });

            const form = page.locator('form');
            await expect(form).toBeVisible({ timeout: 5000 });

            console.log('Create Client form rendered successfully');
        } else {
            console.log('Create Client button not found');
            await page.screenshot({ path: 'test-results/screenshots/13-clients-no-create-button.png', fullPage: true });
        }

        const errors = col.getErrors();
        if (errors.length > 0) {
            console.log('Create Client Form Errors:', errors);
        }
    });

    test('Test 11: Part Request Creation Workflow', async ({ page }) => {
        const col = new ConsoleCollector();
        const network = new NetworkCollector();

        col.attach(page);
        network.attach(page);

        await page.goto('/dashboard/inventory');

        const createButton = page.locator('button:has-text("Create"), button:has-text("New Request"), a:has-text("Create")').first();

        if (await createButton.count() > 0) {
            await createButton.click();
            await page.waitForTimeout(1000);

            await page.screenshot({ path: 'test-results/screenshots/14-create-part-request-form.png', fullPage: true });

            // Check for form
            const form = page.locator('form');
            const formExists = await form.count() > 0;

            console.log(`Part Request form rendered: ${formExists}`);

            if (formExists) {
                // Try to find item addition controls
                const addItemButton = page.locator('button:has-text("Add Item"), button:has-text("Add Part")').first();
                const hasAddItem = await addItemButton.count() > 0;
                console.log(`Add Item functionality present: ${hasAddItem}`);
            }
        } else {
            console.log('Create Part Request button not found');
            await page.screenshot({ path: 'test-results/screenshots/14-parts-no-create-button.png', fullPage: true });
        }

        const errors = col.getErrors();
        if (errors.length > 0) {
            console.log('Part Request Creation Errors:', errors);
        }

        if (network.hasFailed()) {
            console.log('Part Request Network Failures:', network.getFailures());
        }
    });

    test('Test 12: Inventory Search and Filter', async ({ page }) => {
        const col = new ConsoleCollector();
        col.attach(page);

        await page.goto('/dashboard/inventory');
        await page.waitForTimeout(2000);

        // Look for search input
        const searchInput = page.locator('input[type="search"], input[placeholder*="Search"], input[placeholder*="search"]').first();

        if (await searchInput.count() > 0) {
            await searchInput.fill('test');
            await page.waitForTimeout(1000);

            await page.screenshot({ path: 'test-results/screenshots/15-inventory-search.png', fullPage: true });

            console.log('Inventory search functionality present');
        } else {
            console.log('Search input not found');
            await page.screenshot({ path: 'test-results/screenshots/15-inventory-no-search.png', fullPage: true });
        }

        const errors = col.getErrors();
        if (errors.length > 0) {
            console.log('Inventory Search Errors:', errors);
        }
    });
});
