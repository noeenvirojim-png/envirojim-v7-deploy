import { test, expect } from '@playwright/test';

test.describe('Module 6: Reporting & Analytics IA', () => {
    test.beforeEach(async ({ page }) => {
        // Authenticate as Admin (CDO / Analyst Role)
        await page.goto('/login');
        await page.fill('input[name="email"]', 'analyst@envirojim.com');
        await page.fill('input[name="password"]', 'password123');
        await page.click('button[type="submit"]');
        await expect(page).toHaveURL('/dashboard');
    });

    test('Analytics Dashboard & AI Insights Verification', async ({ page }) => {
        await page.goto('/dashboard/analytics');
        
        // 1. Verify KPI Loading
        await expect(page.locator('text=Machines Actives')).toBeVisible();
        await expect(page.locator('text=Maintenance Critique')).toBeVisible();

        // 2. Verify AI Section
        await expect(page.locator('text=Insights Prédictifs')).toBeVisible();
        await expect(page.locator('text=Predictions & Insights Prédictifs')).toBeVisible();
        await expect(page.locator('text=Analysé par Gemini 1.5 Flash')).toBeVisible();

        // 3. Verify Executive Summary
        await expect(page.locator('text=Résumé Exécutif Opérationnel')).toBeVisible();
    });

    test('Anomaly Detection & Alerting', async ({ page }) => {
        await page.goto('/dashboard/analytics');
        
        // Check for anomalies card
        const anomalyCard = page.locator('text=Signaux d\'Anomalies');
        await expect(anomalyCard).toBeVisible();

        // Simulate Alert Action (if an anomaly exists)
        const alertButton = page.locator('text=ALERTER SUPERVISEUR').first();
        if (await alertButton.isVisible()) {
            await alertButton.click();
            // In a real browser, this would open the mail client
        }
    });

    test('CSV Export Functionality', async ({ page }) => {
        await page.goto('/dashboard/analytics');
        
        // Trigger Export
        const [download] = await Promise.all([
            page.waitForEvent('download'),
            page.click('text=EXPORTER RAPPORT (CSV)')
        ]);

        expect(download.suggestedFilename()).toContain('envirojim_operational_report');
    });
});
