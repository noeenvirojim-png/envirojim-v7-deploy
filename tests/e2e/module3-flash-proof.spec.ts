import { test, expect } from '@playwright/test';

test.describe('Module 3: Flash-Proof Part Orders', () => {
    test.beforeEach(async ({ page }) => {
        // Authenticate as EnviroJim Admin
        await page.goto('/login');
        await page.fill('input[name="email"]', 'admin@envirojim.com');
        await page.fill('input[name="password"]', 'password123');
        await page.click('button[type="submit"]');
        await expect(page).toHaveURL('/dashboard');
    });

    test('Full Flash-Proof Procurement Workflow', async ({ page }) => {
        await page.goto('/dashboard/orders');
        
        // 1. Create Order with Flash-Proof Fields
        await page.click('text=Nouvelle Demande');
        await page.fill('input[placeholder*="EJ-2024"]', 'TEST-SN-003');
        await page.fill('textarea[placeholder*="bolt"]', 'Alternateur pour moteur Deutz flou');
        
        // Use AI Assertion (Simplified click)
        await page.click('text=SUGGESTION IA CATALOGUE');
        await page.waitForSelector('text=Suggestion IA:');

        // Set Logistics
        await page.selectOption('select:near(label:text("Destination"))', 'CLIENT');
        await page.selectOption('select:near(label:text("Type Transport"))', 'INTERNATIONAL');
        await page.fill('input[placeholder="2.5"]', '15'); // Weight
        await page.fill('input[placeholder="20x20x10"]', '40x40x30'); // Dims
        await page.fill('input[type="number"]', '150'); // Transport Quote

        await page.click('text=CRÉER LA DEMANDE');
        await page.waitForSelector('text=Commande créée');

        // 2. Verify in Table
        await expect(page.locator('text=TEST-SN-003')).toBeVisible();
        await expect(page.locator('text=INTERNATIONAL')).toBeVisible();

        // 3. Test Email Generation Triggers
        await page.click('button:near(text("TEST-SN-003"))'); // Open Actions
        
        // Devis Client
        const [clientMailto] = await Promise.all([
            page.waitForEvent('request'), // Or check window.location if possible
            page.click('text=Envoi Devis Client')
        ]);
        // Verification logic for mailto...
        
        // Commande Fournisseur
        await page.click('text=Commande Fournisseur');
        
        // Facturation (Final)
        await page.click('text=Facturation (Fin)');
    });

    test('Table Filtering & Status Colors', async ({ page }) => {
        await page.goto('/dashboard/orders');
        
        // Search by SN
        await page.fill('input[placeholder*="Rechercher"]', 'TEST-SN-003');
        await expect(page.locator('table')).toContainText('TEST-SN-003');

        // Check for specific status badge colors
        const statusBadge = page.locator('text=Entrée Demande');
        await expect(statusBadge).toHaveClass(/bg-red-500/);
    });
});
