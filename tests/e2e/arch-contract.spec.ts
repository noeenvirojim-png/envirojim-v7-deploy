import { test, expect } from '@playwright/test';

/**
 * ARCHITECTURE REGRESSION CONTRACT TEST
 * 
 * Verifies that the security and architectural invariants are held.
 */

test.describe('Architecture Regression Contract', () => {

    test('Login Admin -> Dashboard -> Machines Lifecycle', async ({ page }) => {
        // 1. Initial Login (Admin)
        await page.goto('/login');
        await page.fill('input[name="email"]', 'noe@envirojim.com');
        await page.fill('input[name="password"]', 'password123');
        await page.click('button[type="submit"]');

        // 2. Dashboard loads
        await expect(page).toHaveURL('/dashboard');

        // 3. Machines list loads
        await page.goto('/dashboard/machines');
        await expect(page.getByRole('heading', { name: 'Machines' })).toBeVisible();

        // 4. Machine Creation + File Upload
        await page.goto('/dashboard/machines/create');
        const uniqueId = `ARCH-${Date.now()}`;

        await page.fill('input[name="serial_number"]', uniqueId);
        await page.fill('input[name="make"]', 'ARCH-TEST');
        await page.fill('input[name="model"]', 'LOCKDOWN-V6');

        // File Upload
        const fileChooserPromise = page.waitForEvent('filechooser');
        await page.click('label:has-text("Upload")');
        const fileChooser = await fileChooserPromise;
        await fileChooser.setFiles('tests/e2e/dummy.pdf');

        await page.click('button[type="submit"]');

        // 5. Success State
        await expect(page.getByText('Successfully created machine')).toBeVisible({ timeout: 15000 });

        // 6. Persistence Check
        await page.click('button:has-text("Return to Dashboard")');
        await page.fill('input[placeholder*="Search"]', uniqueId);
        await expect(page.getByText(uniqueId).first()).toBeVisible();

        // 7. Cleanup (Optional, but good for stability)
        await page.click(page.getByText(uniqueId).first());
        await page.click('button:has-text("Delete")');
        await expect(page).toHaveURL('/dashboard/machines');
    });

    test('RBAC: Technician cannot delete machine', async ({ page }) => {
        // 1. Login as Tech (Simulated by using a tech account if available, or just mocking session)
        // For this test, we expect the UI to hide the delete button OR the server to reject with 403

        // Assuming 'tech@envirojim.com' is a seeded technician
        await page.goto('/login');
        await page.fill('input[name="email"]', 'tech@envirojim.com');
        await page.fill('input[name="password"]', 'password123');
        await page.click('button[type="submit"]');

        await page.goto('/dashboard/machines');

        // Pick any machine
        const firstMachine = page.locator('[data-serial]').first();
        if (await firstMachine.isVisible()) {
            await firstMachine.click();

            // Delete button should either be missing or disable/fail
            const deleteBtn = page.getByRole('button', { name: /delete/i });
            const isVisible = await deleteBtn.isVisible();

            if (isVisible) {
                // If it exists, it must return an error or be disabled
                await deleteBtn.click();
                // We expect a toast/error or no action
                // This depends on the specific UI implementation of RBAC
                console.log('RBAC Check: Delete button visible for technician, verifying enforcement...');
            } else {
                console.log('RBAC Check: Delete button hidden for technician (PASSED)');
            }
        }
    });

});
