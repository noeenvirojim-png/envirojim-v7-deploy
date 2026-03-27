
import { test, expect } from '@playwright/test';
import { ConsoleCollector, NetworkCollector, TEST_CREDENTIALS, login } from './fixtures';
import path from 'path';

test.describe('Machine CRUD and Integrity', () => {

    test.beforeEach(async ({ page }) => {
        await login(page, TEST_CREDENTIALS.super);
    });

    test('Create Machine with File Upload', async ({ page }) => {
        const col = new ConsoleCollector();
        col.attach(page);

        console.log('--- STARTING MACHINE CREATE TEST ---');

        // 1. Navigate to Create Page
        await page.goto('/dashboard/machines/create', { timeout: 60000 });
        await expect(page.getByRole('heading', { name: 'Add New Machine' })).toBeVisible();

        // 2. Fill Form
        const uniqueId = `TEST-${Date.now()}`;
        await page.fill('input[name="serial_number"]', uniqueId);
        await page.fill('input[name="make"]', 'GenAI HeavyInd');
        await page.fill('input[name="model"]', 'X-9000');
        await page.fill('input[name="year"]', '2024');

        await page.fill('input[name="country"]', 'Canada');
        await page.fill('input[name="state_province"]', 'Quebec');
        await page.fill('input[name="city"]', 'Montreal');

        // 3. Upload File
        const fileInput = page.locator('input[name="manual"]');
        await fileInput.setInputFiles(path.join(__dirname, 'dummy.pdf'));

        // 4. Submit
        const submitBtn = page.locator('button[type="submit"]');
        await submitBtn.click();

        // 5. Verify Redirect and Creation
        // 5. Verify Redirect and Creation (or catch error)
        try {
            await Promise.race([
                page.waitForURL('**/dashboard/machines', { timeout: 60000 }),
                page.locator('.text-red-500').waitFor({ state: 'visible', timeout: 60000 }).then(() => { throw new Error('Form Error Visible'); })
            ]);
            console.log('✅ Machine Created and Redirected');
        } catch (e: any) {
            if (e.message === 'Form Error Visible') {
                const errorMsg = await page.locator('.text-red-500').textContent();
                console.error('❌ Form Submission Failed:', errorMsg);
                throw new Error(`Form Submission Failed: ${errorMsg}`);
            }
            throw e;
        }

        // 6. Verify in List
        // Use the same robust card selector as hard-gate
        // Filter by text to ensure our specific machine is there
        const machineCard = page.locator('.grid > div').filter({ hasText: uniqueId }).first();
        await expect(machineCard).toBeVisible({ timeout: 10000 });
        console.log(`✅ Machine ${uniqueId} found in list`);

        const errors = col.getErrors();
        if (errors.length > 0) console.error('Console Errors:', errors);
        expect(errors.length).toBe(0);
    });
});
