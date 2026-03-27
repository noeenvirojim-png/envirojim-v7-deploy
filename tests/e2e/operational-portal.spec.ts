import { test, expect } from '@playwright/test';

// Configuration for heading mode and simulating technician context
test.use({
    geolocation: { longitude: 4.8357, latitude: 45.7640 },
    permissions: ['geolocation', 'microphone'],
});

test.describe('EnviroJim V6 Operational Portal E2E', () => {

    const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';

    test('1. Authentication & Dashboard Load', async ({ page }) => {
        await page.goto(`${BASE_URL}/login`);

        // Fill credentials (Assuming test IDs or standard selectors)
        await page.fill('input[type="email"]', 'admin@envirojim.com');
        await page.fill('input[type="password"]', 'admin123');
        await page.click('button[type="submit"]');

        // Wait for Command Center
        await expect(page.locator('text=Centre de Commandement')).toBeVisible({ timeout: 10000 });

        // Validate KPI Widgets load
        await expect(page.locator('text=Machines Actives')).toBeVisible();
        await expect(page.locator('text=Tickets Ouverts')).toBeVisible();
    });

    test('2. Voice-First Daily Inspections & Auto-Ticket', async ({ page }) => {
        await page.goto(`${BASE_URL}/dashboard/inspections`);

        await expect(page.locator('text=Inspection Journalière')).toBeVisible();

        // Step 1: Identity & Hours
        await page.fill('input[placeholder="N° de Série ou ID"]', 'SN-TEST-001');
        await page.fill('input[placeholder="Ex: 4500"]', '4500');
        await page.click('button:has-text("Suivant")');

        // Step 2: Checks (Simulate a failure)
        await expect(page.locator('text=Points de contrôle')).toBeVisible();
        // Pass the first one
        const checkButtons = page.locator('button:has(svg.lucide-check-circle)');
        await checkButtons.nth(0).click();

        // Fail the second one (simulate leak)
        const alertButtons = page.locator('button:has(svg.lucide-alert-triangle)');
        await alertButtons.nth(1).click();

        // Force pass remaining to enable next button
        await checkButtons.nth(2).click();
        await checkButtons.nth(3).click();

        await page.click('button:has-text("Suivant")');

        // Step 3: Voice Input & Submissions
        await expect(page.locator('text=Preuves et commentaires')).toBeVisible();
        const voiceButton = page.locator('button:has(svg.lucide-mic)');
        await expect(voiceButton).toBeVisible();

        // Click submit (should route to /dashboard/tickets/new because of failure)
        await page.click('button:has-text("Créer le Ticket")');

        // Verify escalation routing
        await expect(page).toHaveURL(/.*\/tickets\/new\?machineId=SN-TEST-001&reason=inspection_failed/);
    });

    test('3. Machine Digital Twin & PDF Viewer', async ({ page }) => {
        // Navigate straight to a machine twin manually or via menu
        await page.goto(`${BASE_URL}/dashboard/machines/1`);

        // Verify Overview load
        await expect(page.locator('text=Santé Global')).toBeVisible({ timeout: 10000 });

        // Switch to Documents tab
        await page.click('button[role="tab"]:has-text("Manuels & Docs")');
        await expect(page.locator('text=Base Documentaire')).toBeVisible();

        // Verify PDF viewer logic (iframe)
        const pdfIframe = page.locator('iframe[title="Manuel Technique PDF"]');
        if (await pdfIframe.count() > 0) {
            await expect(pdfIframe.first()).toBeVisible();
        }
    });

    test('4. AI Diagnostic Copilot Workflow', async ({ page }) => {
        await page.goto(`${BASE_URL}/dashboard/diagnosis`);

        // Set machine context
        await page.fill('input[placeholder="Ex: SN-8492"]', 'SN-TEST-001');

        // Verify Voice Input existence
        const voicePanel = page.locator('text=Quel est le problème ?');
        await expect(voicePanel).toBeVisible();
        await expect(page.locator('button:has(svg.lucide-mic)')).toBeVisible();

        // Instead of real voice, we simulate text fallback submission (often exposed during testing or click)
        // To trigger the AI without a real mic in headed CI, we assume a prompt or stub
        // For now we just verify the visual layout is correct.
        const diagnosisHeader = page.locator('h1:has-text("Copilote IA de Diagnostic")');
        await expect(diagnosisHeader).toBeVisible();
    });

    test('5. QR Scanner Route Load', async ({ page }) => {
        await page.goto(`${BASE_URL}/dashboard/scan`);

        // We can't easily test webcam in standard playwrigth without mocking video stream.
        // We check the manual fallback.
        await expect(page.locator('text=Scanner une Machine')).toBeVisible();
        await expect(page.locator('text=Saisie Manuelle (Secours)')).toBeVisible();
        await page.click('text=Saisie Manuelle');
        await expect(page.locator('input[placeholder="Entrez le Serial Number"]')).toBeVisible();
    });

});
