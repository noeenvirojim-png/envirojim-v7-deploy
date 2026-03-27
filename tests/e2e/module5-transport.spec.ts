import { test, expect } from '@playwright/test';

test.describe('Module 5: Transport & Livraison IA', () => {
    test.beforeEach(async ({ page }) => {
        // Authenticate as Logistics Manager (Internal Admin)
        await page.goto('/login');
        await page.fill('input[name="email"]', 'logistics@envirojim.com');
        await page.fill('input[name="password"]', 'password123');
        await page.click('button[type="submit"]');
        await expect(page).toHaveURL('/dashboard');
    });

    test('Full Shipment Lifecycle Workflow', async ({ page }) => {
        await page.goto('/dashboard/transport');
        
        // 1. Create New Transport
        await page.click('text=NOUVEAU TRANSPORT');
        await page.fill('input[placeholder*="Machine SN"]', 'EJ-2024-X100');
        await page.fill('input[placeholder*="Transporteur"]', 'CMA CGM');
        await page.fill('input[placeholder*="Référence"]', 'CARRIER-789-V6');
        
        await page.click('text=ENREGISTRER TRANSPORT');
        await page.waitForSelector('text=CARRIER-789-V6');

        // 2. Mock AI Driver Voice Note
        // This simulates the driver recording a note which triggers AI reformatting
        await page.click('button:near(text("CARRIER-789-V6"))'); // Open Actions
        await page.click('text=Simuler Note Vocale Conducteur');
        
        await page.waitForSelector('text=Rapport IA Dispo');
        await expect(page.locator('text=Retardé')).toBeVisible(); // Auto-triggered by AI alert

        // 3. Verify KPI Update
        const delayedCard = page.locator('div:has-text("Retards Signalés") >> text=1');
        await expect(delayedCard).toBeVisible();

        // 4. Test Delivery Confirmation
        await page.click('button:near(text("CARRIER-789-V6"))');
        await page.click('text=Marquer comme Livré');
        await expect(page.locator('text=Livré')).toBeVisible();
    });

    test('Transport Filtering and Multi-browser Verification', async ({ page }) => {
        await page.goto('/dashboard/transport');
        
        // Search by Reference
        await page.fill('input[placeholder*="Rechercher"]', 'CARRIER-789-V6');
        await expect(page.locator('table')).toContainText('CMA CGM');

        // Check columns density
        const tableHeads = await page.locator('th').allInnerTexts();
        expect(tableHeads.length).toBeGreaterThanOrEqual(7);
    });
});
