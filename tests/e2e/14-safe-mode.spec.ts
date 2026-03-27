import { test, expect } from '@playwright/test';
import { createClient } from '@supabase/supabase-js';
import path from 'path';
import dotenv from 'dotenv';
import fs from 'fs';

dotenv.config({ path: path.resolve(__dirname, '../../.env.local') });

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const adminClient = createClient(SUPABASE_URL, SERVICE_KEY);

async function createVictim(email: string) {
    const { data: org } = await adminClient.from('organizations').select('id').limit(1).single();
    if (!org) throw new Error('No org');
    const orgId = org.id;

    // Clean
    const { data: existing } = await adminClient.auth.admin.listUsers();
    const oldUser = existing.users.find(u => u.email === email);
    if (oldUser) await adminClient.auth.admin.deleteUser(oldUser.id);

    const { data: user, error } = await adminClient.auth.admin.createUser({
        email,
        password: 'ChaosPassword123!',
        email_confirm: true,
        user_metadata: { full_name: 'SafeMode Victim', organization_id: orgId },
        app_metadata: { role: 'TECHNICIAN', organization_id: orgId }
    });
    if (error) throw error;

    await adminClient.from('users').upsert({
        id: user.user.id,
        email,
        full_name: 'SafeMode Victim',
        role: 'TECHNICIAN',
        organization_id: orgId
    });

    return { user: user.user, orgId };
}

test.describe('Chaos Engineering: Safe Mode & Robustness', () => {

    test('5.1 Chaos Payload Injection (Duplicate Serial Attack)', async ({ page }) => {
        const EMAIL = 'chaos-payload@envirojim.com';
        const { orgId } = await createVictim(EMAIL);
        const DUP_SERIAL = 'CHAOS-DUP-' + Date.now();

        // 1. Manually insert the first machine to ensure conflict
        await adminClient.from('machines').insert({
            serial_number: DUP_SERIAL,
            make: 'Original',
            model: 'X1',
            organization_id: orgId,
            status: 'ACTIVE'
        });

        // 2. Login
        await page.goto('/login');
        await page.fill('input[name="email"]', EMAIL);
        await page.fill('input[name="password"]', 'ChaosPassword123!');
        await page.click('button[type="submit"]');
        await expect(page.getByText('Command Center')).toBeVisible({ timeout: 15000 });

        // 3. Attempt to create DUPLICATE
        await page.goto('/dashboard/machines/create');
        await page.fill('input[name="serial_number"]', DUP_SERIAL);
        await page.fill('input[name="make"]', 'Evil Twin');
        await page.fill('input[name="model"]', 'X2');
        await page.fill('input[name="country"]', 'Chaos');
        await page.fill('input[name="state_province"]', 'Test');
        await page.fill('input[name="city"]', 'Testing');

        // File Upload
        const filePath = path.join(process.cwd(), 'test-manual.pdf');
        if (!fs.existsSync(filePath)) fs.writeFileSync(filePath, 'fake pdf content');
        await page.setInputFiles('input[name="manual"]', filePath);

        await page.click('button[type="submit"]');

        // 4. Assert: UI handles Duplicate gracefully (shows error)
        // Red error box should appear
        await expect(page.getByText(/error|failed|already exists/i)).toBeVisible({ timeout: 10000 });
        console.log('✅ Duplicate payload rejection handled by UI.');
    });

    test('5.2 Supabase Failure Simulation (High Latency)', async ({ page }) => {
        const EMAIL = 'chaos-latency@envirojim.com';
        await createVictim(EMAIL);

        // A. Login
        await page.goto('/login');
        await page.fill('input[name="email"]', EMAIL);
        await page.fill('input[name="password"]', 'ChaosPassword123!');
        await page.click('button[type="submit"]');
        await expect(page.getByText('Command Center')).toBeVisible();

        // B. Simulation: Inject 5s latency into API/Dashboard routes
        console.log('⏳ SIMULATING HIGH LATENCY (5s delay)...');
        await page.route('**/dashboard/**', async route => {
            await new Promise(resolve => setTimeout(resolve, 5000));
            route.continue();
        });

        // C. Trigger: Interaction
        const start = Date.now();
        await page.goto('/dashboard/machines', { timeout: 60000 });

        // D. Assert: UI renders
        await expect(page.locator('h1').getByText('Machines')).toBeVisible({ timeout: 20000 });
        const duration = Date.now() - start;
        console.log(`✅ Loaded under latency in ${duration}ms`);
        expect(duration).toBeGreaterThan(5000);
    });

});
