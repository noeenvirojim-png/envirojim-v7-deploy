import { test, expect } from '@playwright/test';

test.describe('EnviroJim V7: Advanced Diagnostic & Work Orders', () => {

    test('Guided Diagnostic Tree & Escalation', async ({ page }) => {
        await page.goto('/dashboard/diagnosis');
        await page.fill('input[placeholder="Ex: SN-8492"]', 'SN-TEST-NUCLEAR');
        
        // Simulate a voice/chat input
        await page.fill('textarea', 'Le moteur fume noir et il y a une perte de puissance');
        await page.click('button:has-text("Lancer le Diagnostic")');
        
        // Wait for AI results
        await expect(page.locator('text=Diagnostic Premium')).toBeVisible({ timeout: 20000 });
        
        // Start Guided Tree
        await page.click('button:has-text("Démarrer le Guide Pas-à-Pas")');
        
        // Answer NO 5 times to trigger escalation
        for (let i = 0; i < 5; i++) {
            await expect(page.locator('text=Étape')).toBeVisible();
            await page.click('button:has-text("NON")');
        }
        
        // Verify escalation trigger
        await expect(page.locator('text=CONTACTER DEALER')).toBeVisible();
    });

    test('Work Order Dictation & Smart Photos', async ({ page }) => {
        await page.goto('/dashboard/work-orders');
        
        // Start timer
        await page.click('button:has-text("Play")');
        
        // Simulate Dictation
        // Note: In real E2E we might need to mock the voice input or just test the text fallback
        await page.fill('textarea', 'Inspection moteur finie. Capteur injection nettoyé. Test de charge OK.');
        // Assuming there's a button to submit from text fallback if provided
        await page.keyboard.press('Enter');
        
        // Verify AI structure
        await expect(page.locator('text=Rapport IA Structuré')).toBeVisible({ timeout: 15000 });
        
        // Verify summary fields
        await expect(page.locator('text=RÉSULTATS')).toBeVisible();
        await expect(page.locator('text=OK')).toBeVisible();
    });

});
