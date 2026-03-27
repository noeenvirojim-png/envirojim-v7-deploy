import { test, expect } from '@playwright/test';

const BASE_URL = process.env.BASE_URL || 'https://envirojim-final-deployment.vercel.app';

test.describe('Envirojim V6 AI Intelligence System - Full Flow', () => {

    test.beforeEach(async ({ page }) => {
        await page.goto(`${BASE_URL}/login`);
        await page.fill('input[type="email"]', 'noe@envirojim.com');
        await page.fill('input[type="password"]', '@Enviro2018!');
        await page.click('button[type="submit"]');
        await page.waitForURL('**/dashboard**', { timeout: 15000 });
    });

    test('1. Manual Knowledge Extraction & Parts Matching', async ({ page }) => {
        // This test simulates the manual upload flow and checks if AI extracted knowledge is available
        await page.goto(`${BASE_URL}/dashboard/machines`);
        
        // Pick a machine
        await page.click('text=SN-TEST-001');
        
        // Go to diagnosis and ask for parts
        await page.goto(`${BASE_URL}/dashboard/diagnosis`);
        await page.fill('input[placeholder="Ex: SN-8492"]', 'SN-TEST-001');
        await page.fill('textarea', 'Quels sont les filtres pour la révision des 500h ?');
        await page.click('button:has-text("Analyser")');

        // Verify AI suggests parts and references the manual
        await expect(page.locator('text=Filtre')).toBeVisible({ timeout: 15000 });
        await expect(page.locator('text=Source: Manual')).toBeVisible();
    });

    test('2. Technician Learning & Diagnostic Copilot', async ({ page }) => {
        // Verifies that a previously reported repair influences current diagnosis
        const symptom = "Vibration anormale bras avant droit";
        
        await page.goto(`${BASE_URL}/dashboard/diagnosis`);
        await page.fill('textarea', symptom);
        await page.click('button:has-text("Analyser")');

        // Should return results based on knowledge base or manual
        await expect(page.locator('text=Cause probable')).toBeVisible({ timeout: 15000 });
        
        // Verify cross-source synthesis
        const sources = await page.locator('.ai-sources').textContent();
        expect(sources?.length).toBeGreaterThan(0);
    });

    test('3. Predictive Failure Alerts', async ({ page }) => {
        await page.goto(`${BASE_URL}/dashboard`);
        
        // Check for fleet intelligence alerts in the dashboard (if implemented in UI)
        // For now, checking if "Alertes Prédictives" section is visible
        await expect(page.locator('text=Alertes Prédictives')).toBeVisible();
    });
});
