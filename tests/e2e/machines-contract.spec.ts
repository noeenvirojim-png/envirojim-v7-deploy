
import { test, expect } from '@playwright/test';
import { ConsoleCollector, TEST_CREDENTIALS, login } from './fixtures';
import path from 'path';

test.describe('Machines Contract: CRUD & Persistence', () => {

    test.beforeEach(async ({ page }) => {
        await login(page, TEST_CREDENTIALS.super);
    });

    test('Full Lifecycle: Create -> Persist -> Delete', async ({ page }) => {
        const col = new ConsoleCollector();
        col.attach(page);
        console.log('--- STARTING MACHINE CONTRACT TEST ---');

        // 1. Health Check (Implicit via Login)
        // 2. Navigate to Create
        await page.goto('/dashboard/machines/create', { timeout: 30000 });

        // 3. Fill Form
        const uniqueId = `CONTRACT-${Date.now()}`;
        await page.fill('input[name="serial_number"]', uniqueId);
        await page.fill('input[name="make"]', 'TestInd');
        await page.fill('input[name="model"]', 'T-1000');
        await page.fill('input[name="year"]', '2025');
        await page.fill('input[name="current_hours"]', '100'); // Added missing field

        await page.fill('input[name="country"]', 'USA');
        await page.fill('input[name="state_province"]', 'TestState');
        await page.fill('input[name="city"]', 'TestCity');

        // 4. Upload File
        const fileInput = page.locator('input[name="manual"]');
        await fileInput.setInputFiles(path.join(__dirname, 'dummy.pdf'));

        // 5. Submit
        await page.click('button[type="submit"]');

        // 6. Verify Creation & Redirect
        try {
            // Wait for Success Card OR Error
            await Promise.race([
                page.getByText('Machine Created Successfully').waitFor({ timeout: 60000 }),
                page.locator('.text-destructive').waitFor({ state: 'visible', timeout: 60000 }).then(() => { throw new Error('Form Error Visible'); })
            ]);
            console.log('✅ Machine Created (Success UI Visible)');

            // Click Return to Dashboard
            console.log('--- Clicking Return to Dashboard ---');
            await page.getByRole('button', { name: 'Return to Dashboard' }).click();
            console.log('--- Waiting for Redirect ---');
            await page.waitForURL('**/dashboard/machines', { timeout: 30000 });
            console.log('--- Redirect Success ---');

        } catch (e: any) {
            if (e.message === 'Form Error Visible') {
                const errorMsg = await page.locator('.text-destructive').textContent();
                console.error('❌ Form Submission Failed:', errorMsg);
                throw new Error(`Form Submission Failed: ${errorMsg}`);
            }
            throw e;
        }

        // 7. Verify Persistence (Reload Page)
        await page.waitForTimeout(2000); // Wait for revalidation consistency
        await page.reload();
        await expect(page.getByText(uniqueId).first()).toBeVisible();
        console.log('✅ Persistence Verified');

        // 8. Navigate to Details
        console.log(`--- Navigating to Machine ${uniqueId} ---`);
        const machineLink = page.getByText(uniqueId).first();
        await expect(machineLink).toBeVisible({ timeout: 10000 });
        await machineLink.click();
        console.log('--- Clicked Machine ---');
        await page.waitForURL(`**/dashboard/machines/**`);

        // 9. Verify Delete Button Exists and Click
        const deleteBtn = page.getByRole('button', { name: 'Supprimer' });
        await expect(deleteBtn).toBeVisible();

        // Handle Dialog
        page.on('dialog', dialog => dialog.accept());
        await deleteBtn.click();

        // 10. Verify Redirect after Delete
        await page.waitForURL('**/dashboard/machines', { timeout: 30000 });
        console.log('✅ Deleted and Redirected');

        // 11. Verify Gone
        await expect(page.getByText(uniqueId)).not.toBeVisible();
        console.log('✅ Deletion Verified');

        const errors = col.getErrors();
        if (errors.length > 0) {
            // Filter out known harmless errors if any
            const realErrors = errors.filter(e => !e.includes('404')); // Example
            if (realErrors.length > 0) console.error('Console Errors:', realErrors);
            expect(realErrors.length).toBe(0);
        }
    });

});
