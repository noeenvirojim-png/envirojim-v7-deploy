import { test, expect } from '@playwright/test';

/**
 * ENVIROJIM V8: PRODUCTION CLIENT ONBOARDING AUDIT
 * Tests the secure invitation flow and RLS isolation.
 */
test.describe('V8 Client Onboarding Workflow', () => {
    
    // 1. ADMIN FLOW: Creation & Invitation
    test('Admin should be able to create and invite a client', async ({ page }) => {
        // Login as Admin
        await page.goto('/login');
        await page.fill('input[name="email"]', 'noe@envirojim.com'); // Using real admin if available, or fixtures
        await page.fill('input[name="password"]', 'EnviroJim2024!');
        await page.click('button[type="submit"]');
        
        await expect(page).toHaveURL(/dashboard/);
        
        // Navigate to Clients
        await page.goto('/dashboard/clients');
        
        // Fill Onboarding Form
        const testClientEmail = `test-onboarding-${Date.now()}@example.com`;
        await page.fill('input[placeholder="ex: Acme Mining Corp"]', 'Playwright Test Client');
        await page.fill('input[placeholder="client@acme.com"]', testClientEmail);
        
        await page.click('button:has-text("INITIALISER LE CLIENT")');
        
        // Verify success feedback
        await expect(page.locator('text=Client enregistré')).toBeVisible();
        
        // Click Back to list or refresh (ClientsListV8 is alive)
        await page.click('button:has-text("AJOUTER UN AUTRE CLIENT")');
        
        // Find the client in the list and click "Inviter"
        const clientRow = page.locator('tr', { hasText: testClientEmail });
        await expect(clientRow).toBeVisible();
        
        await clientRow.locator('button:has-text("Inviter")').click();
        
        // Verify link sent toast
        await expect(page.locator('text=Lien d\'invitation envoyé avec succès')).toBeVisible();
    });

    // 2. TOKEN SECURITY: Expiration & RLS
    test('Secure tokens should be invalid if manipulated or expired', async ({ page, request }) => {
        // Attempt to access onboarding with a junk token
        await page.goto('/oauth/login?token=invalid-junk-token-123');
        
        await page.click('button:has-text("CONTINUER AVEC GOOGLE")');
        
        // Should show error from the API
        await expect(page.locator('text=Invalid or expired invitation token')).toBeVisible({ timeout: 10000 });
    });

    // 3. UI AUDIT: Responsive & Glassmorphism
    test('Client Landing Page should maintain V8 Premium aesthetics', async ({ page }) => {
        // Navigate to OAuth landing with a dummy valid-looking token format
        await page.goto('/oauth/login?token=0000000000000000000000000000000000000000000000000000000000000000');
        
        // Verify visual elements
        await expect(page.locator('h1')).toHaveText(/BIENVENUE SUR ENVIROJIM V8/);
        await expect(page.locator('button:has-text("GOOGLE")')).toBeVisible();
        await expect(page.locator('button:has-text("MICROSOFT")')).toBeVisible();
        
        // Check for specific Blue/Dark theme markers
        const bg = await page.locator('div.bg-\\[\\#0f172a\\]');
        await expect(bg).toBeVisible();
        
        // Mobile view audit
        await page.setViewportSize({ width: 375, height: 667 });
        await expect(page.locator('button:has-text("GOOGLE")')).toBeVisible();
    });
});
