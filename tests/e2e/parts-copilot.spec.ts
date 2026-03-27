import { test, expect } from '@playwright/test';

test.use({ headless: false }); // Force headed Chromium execution

test.describe('Predictive Parts & Maintenance Copilot - Full E2E Workflow', () => {
    // Extended timeout for AI completions, document matching, and possible DB operations
    test.setTimeout(120000);

    test('should validate AI suggestions, confirmation prompts, and predictive checklist creation', async ({ page, request }) => {
        const testUserEmail = 'test@envirojim.com';
        const testUserPass = 'Password123!';

        // ----------------------------------------------------------------------
        // 1. TEST SETUP & AUTHENTICATION
        // ----------------------------------------------------------------------
        await test.step('Authenticate User', async () => {
            await page.goto(`${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}/dashboard`);

            // Handle login if redirected to auth
            if (page.url().includes('/login')) {
                const emailInput = page.locator('input[type="email"], input[name="email"]');
                await emailInput.fill(testUserEmail);

                const passInput = page.locator('input[type="password"], input[name="password"]');
                await passInput.fill(testUserPass);

                await page.click('button[type="submit"]');
                await page.waitForURL('**/dashboard**');
            }
        });

        // ----------------------------------------------------------------------
        // 2. ERP TABLE & MACHINE DETAIL NAVIGATION
        // ----------------------------------------------------------------------
        await test.step('Navigate to ERP Table and select a machine', async () => {
            // Go to machines ERP list
            await page.click('text="Machines"');
            await page.waitForURL('**/dashboard/machines**');

            // Verify ERP table renders
            await expect(page.locator('table')).toBeVisible();

            // Apply Filters (Search & Sort)
            const searchInput = page.locator('input[placeholder="Search SN, Model, Client..."]');
            await expect(searchInput).toBeVisible();
            await searchInput.fill('Excavator');
            await page.keyboard.press('Enter');

            // Wait for Server Component to reload row data (debounce delay + fetch)
            await page.waitForTimeout(2000);

            // Ensure rows are present and click the first valid row to navigate to details
            await page.waitForSelector('tbody tr', { state: 'visible' });
            await page.locator('tbody tr').first().click();
            await page.waitForURL('**/dashboard/machines/**', { timeout: 15000 });
        });

        // ----------------------------------------------------------------------
        // 3. PARTS COPILOT WORKFLOW
        // ----------------------------------------------------------------------
        await test.step('Interact with the natural language Parts Copilot', async () => {
            // Navigate to the Parts Hub Tab
            await page.click('text="Parts"');
            await expect(page.locator('text="Copilote Pièces & Maintenance"')).toBeVisible();

            // Enter natural query intended to trigger suggestions + upcoming maintenance
            const aiInput = page.locator('input[placeholder*="Ex:"]');
            await aiInput.fill('pièces convoyeur avant droit pour révision 500h');

            // Trigger getPartsSuggestions
            await page.locator('form button[type="submit"]').click();

            // Wait for asynchronous LLM/RAG generation to process
            await expect(page.locator('text="L\'IA analyse le manuel et croise les références..."')).toBeVisible();

            // Validate that the results card ultimately renders
            await expect(page.locator('text="Pièces Recommandées"')).toBeVisible({ timeout: 60000 });

            // Verification: Ensure the confidence badging scheme is applied correctly to matched arrays
            // Check for presence of generic confirmation text box output by AI
            // Due to AI non-determinism, check bounding elements rather than strict text blocks
            await expect(page.locator('.bg-blue-50')).toBeVisible(); // Confirmation box background
        });

        // ----------------------------------------------------------------------
        // 4. PREDICTIVE MAINTENANCE CHECKLIST
        // ----------------------------------------------------------------------
        await test.step('Generate predictive checklists based on RAG parameters', async () => {
            const checklistCard = page.locator('text="Checklist Prédictive"');

            // Check if AI deemed a checklist was appropriate given the query
            if (await checklistCard.isVisible()) {
                // Verify predictive tasks format (description & schedule constraints displayed)
                await expect(page.locator('.text-emerald-500')).first().toBeVisible(); // Task icons

                // Trigger createPredictiveChecklist mutation
                const generateBtn = page.locator('button:has-text("Générer la Checklist")');
                await expect(generateBtn).toBeEnabled();
                await generateBtn.click();

                // Assert Success Notification (Toast UI)
                await expect(page.locator('text="Checklist prédictive générée avec succès !"')).toBeVisible();

                // Assert button is now disabled to prevent duplicate submissions
                await expect(page.locator('button:has-text("Checklist Associée")')).toBeDisabled();
            } else {
                console.log("No predictive checklist was returned by the AI for this specific query parameter.");
            }
        });

        // ----------------------------------------------------------------------
        // 5. ASSERTIONS & CLEANUP
        // ----------------------------------------------------------------------
        await test.step('Confirm clean UI state and Server Action boundary completions', async () => {
            // UI elements are stabilized
            await expect(page.locator('text="Copilote Pièces & Maintenance"')).toBeVisible();

            /** 
             * Validation: In a broader integration scenario, you could verify RLS bounds by swapping 
             * authenticated users and verifying 404s/Unauthorized errors, or by executing a direct DB assertion 
             * to verify the newly inserted Checklist state reads "DRAFT". 
             * 
             * Example API check:
             * const res = await request.get('/api/test-utils/verify-checklists');
             * expect(res.ok()).toBeTruthy();
             */
        });
    });
});
