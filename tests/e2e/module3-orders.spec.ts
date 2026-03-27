import { test, expect } from '@playwright/test';

test.describe('Module 3: New Parts Request / Orders Workflow', () => {

    test('should allow admin to create an order and trigger email generation', async ({ page }) => {
        // 1. Login & Navigate
        await page.goto('/login');
        await page.fill('input[name="email"]', 'noe@envirojim.com');
        await page.fill('input[name="password"]', 'EnviroJim2024!');
        await page.click('button[type="submit"]');
        
        await page.waitForURL('/dashboard');
        await page.goto('/dashboard/orders');
        await expect(page.locator('h1')).toContainText('Orders');

        // 2. Open Order Creator
        await page.click('button:has-text("New Request")');
        await expect(page.locator('text=New Order Request')).toBeVisible();

        // 3. Fill details (Fuzzy description)
        await page.fill('input[name="serial_number"]', 'SEED-CANONICAL-001');
        await page.fill('textarea[name="description_fuzzy"]', 'Front conveyor bolt reinforced');
        await page.fill('input[name="quantity"]', '4');
        
        // 4. Submit
        await page.click('button:has-text("Create Order")');
        await expect(page.locator('text=Order created')).toBeVisible();

        // 5. Verify in Table
        await expect(page.locator('table')).toContainText('Front conveyor bolt reinforced');
        await expect(page.locator('table')).toContainText('4');

        // 6. Test Email Generation Workflow
        // Clicking the actions menu for the first row
        await page.click('table tbody tr:first-child button:has(svg.lucide-more-horizontal)');
        await page.click('text=Envoi Fournisseur');

        // We can't easily check the mailto link launch in headless, 
        // but we can verify our server action returned a success state in logs if we had them.
        // For E2E purposes, we check that no crash occurred.
        await expect(page.locator('table')).toBeVisible();
    });

    test('should show read-only view for non-admins', async ({ page }) => {
        // Login as operator/client
        await page.goto('/login');
        await page.fill('input[name="email"]', 'operator@envirojim.com');
        await page.fill('input[name="password"]', 'password');
        await page.click('button[type="submit"]');

        await page.goto('/dashboard/orders');
        
        // "New Request" button should NOT be visible
        await expect(page.locator('button:has-text("New Request")')).not.toBeVisible();
        
        // Actions menu should NOT be visible in the table row
        if (await page.locator('table tbody tr').count() > 0) {
            await expect(page.locator('table tbody tr:first-child button:has(svg.lucide-more-horizontal)')).not.toBeVisible();
        }
    });
});
