import { test, expect } from '@playwright/test';
import { createClient } from '@supabase/supabase-js';
import path from 'path';
import dotenv from 'dotenv';
import fs from 'fs';

// Load env
dotenv.config({ path: path.resolve(__dirname, '../../.env.local') });

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!SUPABASE_URL || !SERVICE_KEY) throw new Error('Missing Supabase credentials');

const adminClient = createClient(SUPABASE_URL, SERVICE_KEY);

// Helpers
async function createVictim(email: string, role: string = 'TECHNICIAN') {
    // 1. Get Org
    const { data: org } = await adminClient.from('organizations').select('id').limit(1).single();
    if (!org) throw new Error('No organization found for chaos victim creation');
    const orgId = org.id;

    // 2. Clean previous
    const { data: existing } = await adminClient.auth.admin.listUsers();
    const oldUser = existing.users.find(u => u.email === email);
    if (oldUser) await adminClient.auth.admin.deleteUser(oldUser.id);

    // 3. Create
    const { data: user, error } = await adminClient.auth.admin.createUser({
        email,
        password: 'ChaosPassword123!',
        email_confirm: true,
        user_metadata: { full_name: 'Chaos Victim', organization_id: orgId },
        app_metadata: { role, organization_id: orgId }
    });
    if (error) throw error;

    // 4. Trace in Public
    // Manual sync to ensure dashboard loads
    await adminClient.from('users').upsert({
        id: user.user.id,
        email,
        full_name: 'Chaos Victim',
        role,
        organization_id: orgId
    });

    return { user: user.user, orgId };
}

test.describe('Chaos Engineering & Resilience', () => {

    test('Chaos 1: Active Session Revocation (Org -> NO_ORG)', async ({ page }) => {
        const EMAIL = 'chaos-revoke@envirojim.com';
        const { user } = await createVictim(EMAIL);

        // A. Login & Verify
        await page.goto('/login');
        await page.fill('input[name="email"]', EMAIL);
        await page.fill('input[name="password"]', 'ChaosPassword123!');
        await page.click('button[type="submit"]');
        await expect(page.getByText('Command Center')).toBeVisible({ timeout: 15000 });

        // B. Attack: Revoke Org Access
        console.log(`⚡ ATTACK: Revoking Org for ${EMAIL}...`);
        await adminClient.auth.admin.updateUserById(user.id, {
            app_metadata: { role: 'TECHNICIAN', organization_id: 'NO_ORG' },
            user_metadata: { organization_id: 'NO_ORG' }
        });
        // Sync public user to reflect change (Architecture: Single Source of Truth usually Auth, but App checks public)
        await adminClient.from('users').update({ organization_id: 'NO_ORG' }).eq('id', user.id);

        // C. Trigger: Reload to refresh session/context
        await page.reload();

        // D. Assert: Restricted UI
        // Expect "Accès restreint" or "Restricted"
        await expect(page.getByText(/Accès restreint|Restricted/i)).toBeVisible();

        // Cleanup
        await adminClient.auth.admin.deleteUser(user.id);
    });

    test('Chaos 2: User Deletion Mid-Session', async ({ page }) => {
        const EMAIL = 'chaos-delete@envirojim.com';
        const { user } = await createVictim(EMAIL);

        // A. Login & Verify
        await page.goto('/login');
        await page.fill('input[name="email"]', EMAIL);
        await page.fill('input[name="password"]', 'ChaosPassword123!');
        await page.click('button[type="submit"]');
        await expect(page.getByText('Command Center')).toBeVisible({ timeout: 15000 });

        // B. Attack: DELETE USER
        console.log(`⚡ ATTACK: DELETING USER ${EMAIL}...`);
        await adminClient.auth.admin.deleteUser(user.id);

        // C. Trigger: Interaction
        // Try to navigate to machines
        await page.goto('/dashboard/machines');

        // D. Assert: Redirect to Login
        // Auth guard likely catches invalid session or 403
        await expect(page).toHaveURL(/.*login/);
    });

    test('Chaos 3: Database Read-Only Simulation (Writes blocked)', async ({ page }) => {
        const EMAIL = 'chaos-readonly@envirojim.com';
        const { user } = await createVictim(EMAIL);

        // A. Login
        await page.goto('/login');
        await page.fill('input[name="email"]', EMAIL);
        await page.fill('input[name="password"]', 'ChaosPassword123!');
        await page.click('button[type="submit"]');
        await expect(page.getByText('Command Center')).toBeVisible({ timeout: 15000 });

        // B. Simulate Read-Only: Intercept and block all non-GET requests to Supabase or API
        console.log('⚡ SIMULATING READ-ONLY MODE (Blocking POST/PATCH/DELETE)...');
        await page.route('**/*.supabase.co/**', route => {
            const method = route.request().method();
            if (method !== 'GET' && method !== 'OPTIONS') {
                console.log(`Blocking ${method} request to ${route.request().url()}`);
                route.fulfill({
                    status: 503,
                    contentType: 'application/json',
                    body: JSON.stringify({ error: 'Database is in Read-Only maintenance mode', code: 'READ_ONLY_MODE' })
                });
            } else {
                route.continue();
            }
        });

        // C. Verify: Browsing still works (Reads allowed)
        await page.goto('/dashboard/machines');
        await expect(page.locator('h1').getByText('Machines')).toBeVisible();
        console.log('✅ Read operations still functional.');

        // D. Verify: Write attempt is caught
        // We'll try a simple action like "Create Machine" (if it uses a form submit that we can catch or a Server Action)
        // Since Server Actions use POST, it should be caught.
        await page.goto('/dashboard/machines/create');
        await page.fill('input[name="serial_number"]', 'TEST-SERIAL-CHAOS');
        await page.fill('input[name="make"]', 'Chaos Make');
        await page.fill('input[name="model"]', 'Chaos Model');

        // Submit
        await page.click('button[type="submit"]');

        // E. Assert: Helpful error message or no crash
        // We expect a generic error message or the intercepted JSON error being handled.
        // The exact UI response depends on how the app handles 503s.
        // We just want to ensure we don't end up on a broken state.
        await expect(page.getByText(/error|failed|maintenance|restricted/i)).toBeVisible();
        console.log('✅ Write operation blocked successfully.');

        // Cleanup
        await adminClient.auth.admin.deleteUser(user.id);
    });

});
