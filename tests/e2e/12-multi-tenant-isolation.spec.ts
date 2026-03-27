import { test, expect } from '@playwright/test';
import { TEST_CREDENTIALS, login } from './fixtures';

/**
 * MULTI-TENANT ISOLATION CROSS-ORG DRILL (Phase 4.5 Nuclear)
 */

test.describe('Security: Multi-Tenant Isolation Verification', () => {

    test('Isolation: Org B user cannot see Org A entities', async ({ page }) => {
        // Login as Technician from Org B (Northern SP)
        await login(page, TEST_CREDENTIALS.tech);

        // Attempt to access machines list
        await page.goto('/machines');

        // Verify all machines shown belong to Org B or its sub-orgs
        // Assuming the UI displays organization tags or we can verify by ID
        const orgTags = page.locator('.org-tag');
        const count = await orgTags.count();
        if (count > 0) {
            for (let i = 0; i < count; i++) {
                const text = await orgTags.nth(i).textContent();
                // Org B or its sub-orgs should be the only ones visible
                expect(text).not.toContain('Org A');
            }
        }
    });

    test('Isolation: Direct API Access Blocking Simulation', async ({ page }) => {
        // Attempt to fetch a machine belonging to another org directly via API
        // This simulates a user trying to bypass the UI
        await login(page, TEST_CREDENTIALS.tech);

        // Use a known machine ID from Org A (from seed or example)
        const CROSS_ORG_MACHINE_ID = '00000000-0000-0000-0000-000000000001';

        // We can use page.evaluate to call the internal fetch or just goto the API route if exposed
        // For E2E, we goto the detail page and verify the data layer blocks it
        await page.goto(`/machines/${CROSS_ORG_MACHINE_ID}`);

        // Expect a 404 or an empty state if RLS is engaged
        await expect(page.getByText(/Machine not found|Unauthorized|Not Allowed/i)).toBeVisible();
    });

    test('Isolation: Tickets Isolation', async ({ page }) => {
        await login(page, TEST_CREDENTIALS.tech);
        await page.goto('/tickets');

        // Check filtering/visibility
        // Similar to machines, ensured no records from cross-org are present
        const ticketList = page.locator('.ticket-row');
        await expect(ticketList).toHaveCount(0); // Assuming Org B has no tickets in seed or filtered
    });
});
