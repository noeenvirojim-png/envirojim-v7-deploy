import { test, expect } from '@playwright/test';

test.describe('Module 4: Auto-Checklists & Maintenance IA', () => {
    test.beforeEach(async ({ page }) => {
        // Authenticate as Admin (Internal EnviroJim Admin)
        await page.goto('/login');
        await page.fill('input[name="email"]', 'admin@envirojim.com');
        await page.fill('input[name="password"]', 'password123');
        await page.click('button[type="submit"]');
        await expect(page).toHaveURL('/dashboard');
    });

    test('Automated Checklist Generation at Machine Creation', async ({ page }) => {
        await page.goto('/dashboard/machines/new');
        
        // Create a new machine
        await page.fill('input[name="serial_number"]', 'TEST-Maint-001');
        await page.fill('input[name="make"]', 'EnviroTest');
        await page.fill('input[name="model"]', 'V-Maintenance');
        
        // Mock PDF upload (simplified for test)
        // ...
        
        await page.click('button[type="submit"]');
        await page.waitForSelector('text=Machine created');

        // Navigate to the new machine
        await page.click('text=TEST-Maint-001');
        await page.click('text=Maintenance / Checklists');

        // Verify that Morning and Evening checklists were auto-generated
        await expect(page.locator('text=Daily Morning')).toBeVisible();
        await expect(page.locator('text=Daily Evening')).toBeVisible();
    });

    test('Checklist Execution & Internal Ticket Transfer', async ({ page }) => {
        // Go to an existing machine
        await page.goto('/dashboard/machines');
        await page.click('text=TEST-Maint-001');
        await page.click('text=Maintenance / Checklists');

        // Start Morning Inspection
        await page.click('text=Démarrer Inspection');
        
        // Check items
        const checkboxes = await page.locator('input[type="checkbox"]');
        await checkboxes.first().check();
        
        // Simulate Voice Note (click button)
        await page.click('text=Note Vocale');
        await page.waitForTimeout(1000); // Simulate audio recording
        
        // Save
        await page.click('text=Enregistrer');
        await expect(page.locator('text=Terminé')).toBeVisible();

        // Supervisor View: Verify Internal Ticket
        await page.reload();
        await expect(page.locator('text=Tickets Internes')).toBeVisible();
        
        // Transfer to EnviroJim
        await page.click('text=Réviser');
        await page.click('text=Transfer to EnviroJim');
        await expect(page.locator('text=TRANSFERRED')).toBeVisible();
    });

    test('Maintenance Alert (150h Lead Time)', async ({ page }) => {
        await page.goto('/dashboard/machines');
        await page.click('text=TEST-Maint-001');
        await page.click('text=Maintenance / Checklists');

        // Verify predictive alert is visible if hours are close to interval
        // This assumes some rule was generated at 500h and machine is at 360h
        const alert = page.locator('text=Prédictions Maintenance IA');
        await expect(alert).toBeVisible();
    });
});
