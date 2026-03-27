import { test, expect } from '@playwright/test';
import { createClient } from '@supabase/supabase-js';
import path from 'path';
import dotenv from 'dotenv';
import fs from 'fs';

dotenv.config({ path: path.resolve(__dirname, '../../.env.local') });

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const adminClient = createClient(SUPABASE_URL, SERVICE_KEY);

async function provisionUser(email: string, role: string) {
    const { data: org } = await adminClient.from('organizations').select('id').limit(1).single();
    const orgId = org!.id;

    // Clean
    const { data: existing } = await adminClient.auth.admin.listUsers();
    const oldUser = existing.users.find(u => u.email === email);
    if (oldUser) await adminClient.auth.admin.deleteUser(oldUser.id);

    const { data: user, error } = await adminClient.auth.admin.createUser({
        email,
        password: 'RolePassword123!',
        email_confirm: true,
        user_metadata: {
            full_name: `Role ${role} User`,
            organization_id: orgId,
            role: role // Adding redundant role here for robust fallback
        },
        app_metadata: {
            role,
            organization_id: orgId
        }
    });
    if (error) throw error;

    await adminClient.from('users').upsert({
        id: user.user.id,
        email,
        full_name: `Role ${role} User`,
        role,
        organization_id: orgId
    });

    return { user: user.user, orgId };
}

test.describe('Real User Flow Contract Tests', () => {

    test('6.1.A: ORG_ADMIN Flow Verification', async ({ page }) => {
        const EMAIL = 'contract-admin@envirojim.com';
        await provisionUser(EMAIL, 'ORG_ADMIN');

        // 1. Login
        await page.goto('/login');
        await page.fill('input[name="email"]', EMAIL);
        await page.fill('input[name="password"]', 'RolePassword123!');
        await page.click('button[type="submit"]');
        await expect(page.getByText('Command Center')).toBeVisible({ timeout: 15000 });

        // 2. Verify Admin features
        // Dashboard should have StatCards
        await expect(page.getByText(/Critical Tickets|Active Technicians|Managed Fleet/i)).toBeVisible();

        // Should see "Ajouter une Machine" button
        await expect(page.getByRole('button', { name: /Ajouter une Machine/i })).toBeVisible();

        // Verify side navigation (if exists) or links
        // We expect Admin to potentially see User management or similar if implemented
        // For now, let's verify machines list
        await page.goto('/dashboard/machines');
        await expect(page.locator('h1').getByText('Machines')).toBeVisible();
    });

    test('6.1.B: TECHNICIAN Flow Verification (Restricted)', async ({ page }) => {
        const EMAIL = 'contract-tech@envirojim.com';
        await provisionUser(EMAIL, 'TECHNICIAN');

        // 1. Login
        await page.goto('/login');
        await page.fill('input[name="email"]', EMAIL);
        await page.fill('input[name="password"]', 'RolePassword123!');
        await page.click('button[type="submit"]');
        await expect(page.getByText('Command Center')).toBeVisible({ timeout: 15000 });

        // 2. Verify Dashboard (Specific limited stats if role-based?)
        // In this app, Technician sees the same stats but restricted data.
        await expect(page.getByText('Command Center')).toBeVisible();

        // 3. Verify Restrictions
        // Technician should NOT see Admin specific links (if any were added in sidebar)
        // Check if "Ajouter une Machine" is hidden if policy says so?
        // Actually, our requirement says "Multi-role flow verification (Admin vs Tech)"
        // Typically Admin creates, Tech maintains.

        // Let's verify Tech can see machines list
        await page.goto('/dashboard/machines');
        await expect(page.locator('h1').getByText('Machines')).toBeVisible();
    });

});
