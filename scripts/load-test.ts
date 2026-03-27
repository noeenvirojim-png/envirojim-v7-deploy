import { chromium } from '@playwright/test';
import { createClient } from '@supabase/supabase-js';
import path from 'path';
import dotenv from 'dotenv';

dotenv.config({ path: path.join(process.cwd(), '.env.local') });

/**
 * PRODUCTION LOAD TEST BASELINE
 * 
 * Simulates:
 * - 5 concurrent logins (Browser based)
 * - Dashboard loads
 * - Machine list fetches
 */

async function runLoadTest() {
    console.log('🚀 [LOAD TEST] Starting browser performance baseline (5 concurrent users)...');

    const CONCURRENT_USERS = 5;
    const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    const TEST_EMAIL = 'parts-loadtest-v5@envirojim.com'; // Unique-ish
    const TEST_PASSWORD = 'EnviroJim2024!';

    // 1. Ensure User Exists
    const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

    if (!SUPABASE_URL || !SERVICE_KEY) {
        console.error('Missing Supabase credentials in .env.local');
        process.exit(1);
    }

    const adminClient = createClient(SUPABASE_URL, SERVICE_KEY);

    // Fetch a valid organization
    const { data: orgData, error: orgError } = await adminClient
        .from('organizations')
        .select('id')
        .limit(1)
        .single();

    if (orgError || !orgData) {
        console.error('Failed to fetch a valid organization:', orgError);
        process.exit(1);
    }
    const ORG_ID = orgData.id;
    console.log('Using Org ID:', ORG_ID);

    // Check if user exists or create
    // We try to create. if exists, good.
    const { data: user, error: createError } = await adminClient.auth.admin.createUser({
        email: TEST_EMAIL,
        password: TEST_PASSWORD,
        email_confirm: true,
        user_metadata: { full_name: 'Load Tester', organization_id: ORG_ID, org_id: ORG_ID, role: 'TECHNICIAN' },
        app_metadata: { role: 'TECHNICIAN', organization_id: ORG_ID, org_id: ORG_ID }
    });

    if (createError && !createError.message.includes('already registered') && createError.status !== 422) {
        console.error('Failed to provision test user:', createError);
        process.exit(1);
    }

    // Manual Sync Check (Fix for missing trigger)
    const userId = user?.user?.id || (await adminClient.auth.admin.listUsers()).data.users.find(u => u.email === TEST_EMAIL)?.id;

    if (userId) {
        const { data: publicUser } = await adminClient.from('users').select('id').eq('id', userId).maybeSingle();
        if (!publicUser) {
            console.log('⚠️ Manual Sync: Inserting user into public.users...');
            const { error: insertError } = await adminClient.from('users').insert({
                id: userId,
                email: TEST_EMAIL,
                full_name: 'Load Tester',
                role: 'TECHNICIAN',
                organization_id: ORG_ID
            });
            if (insertError) console.error('Manual Sync Failed:', insertError);
            else console.log('✅ Manual Sync Success');
        }
    }

    console.log('✅ Test User Provisioned:', TEST_EMAIL);

    const results: number[] = [];
    let errors = 0;

    const runVirtualUser = async (id: number) => {
        const browser = await chromium.launch({ headless: true }); // Ensure headless
        const context = await browser.newContext();
        const page = await context.newPage();

        try {
            const start = Date.now();

            // 1. Visit Login
            await page.goto(`${APP_URL}/login`);

            // 2. Perform Login
            await page.fill('input[name="email"]', TEST_EMAIL);
            await page.fill('input[name="password"]', TEST_PASSWORD);
            await page.click('button[type="submit"]');

            // 3. Wait for Dashboard
            // Assert "Command Center" (verified in manual check) or "Dashboard" (if recently changed back?)
            // We changed test expectation to "Command Center".
            await page.waitForURL('**/dashboard', { timeout: 30000 });
            await page.waitForSelector('text=Command Center', { timeout: 15000 });

            const end = Date.now();
            results.push(end - start);
            console.log(`[VU ${id}] Success in ${end - start}ms`);

        } catch (err) {
            console.error(`[VU ${id}] Failed:`, (err as Error).message);
            // Snapshot on error
            try { await page.screenshot({ path: `load-test-fail-${id}.png` }); } catch (e) { }
            errors++;
        } finally {
            await browser.close();
        }
    };

    const startTime = Date.now();
    const tasks = Array.from({ length: CONCURRENT_USERS }, (_, i) => runVirtualUser(i + 1));

    await Promise.all(tasks);
    const totalTime = Date.now() - startTime;

    // Analytics
    results.sort((a, b) => a - b);
    const p95 = results[Math.floor(results.length * 0.95)] || 0;
    const avg = results.reduce((a, b) => a + b, 0) / results.length || 0;

    console.log('\n--- LOAD TEST RESULTS ---');
    console.log(`Total Concurrent Users: ${CONCURRENT_USERS}`);
    console.log(`Successful Logins: ${results.length}`);
    console.log(`Failed Logins: ${errors}`);
    console.log(`Average Response Time: ${avg.toFixed(2)}ms`);
    console.log(`P95 Response Time: ${p95.toFixed(2)}ms`);
    console.log(`Total Duration: ${totalTime}ms`);

    // Gating
    const issues: string[] = [];
    if (p95 > 5000) issues.push(`❌ P95 too slow: ${p95}ms (SLA: 5000ms for browser walk)`);
    if (errors > 0) issues.push(`❌ Concurrent errors detected: ${errors}`);

    if (issues.length > 0) {
        console.error('\n🛑 [LOAD TEST] FAILED:');
        issues.forEach(i => console.error(i));
        process.exit(1);
    } else {
        console.log('\n✅ [LOAD TEST] PASSED. Scalability targets met.');
        process.exit(0);
    }
}

runLoadTest();
