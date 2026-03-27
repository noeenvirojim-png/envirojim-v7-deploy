require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

// ============================================================================
// PHASE 2: AUTH CANONICAL BOOTSTRAP
// ============================================================================
// Objective: Create test user, verify login flow, test session management
// Output: JSON report with PASS/FAIL for each check
// ============================================================================

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const TEST_USER = {
    email: 'noe@envirojim.com',
    password: 'EnviroJim2024!',
    full_name: 'Noe Admin'
};

const results = {
    timestamp: new Date().toISOString(),
    phase: 'PHASE_2_AUTH_BOOTSTRAP',
    checks: [],
    summary: { pass: 0, fail: 0, total: 0 },
    test_user: TEST_USER.email
};

function addCheck(name, status, details = {}) {
    results.checks.push({ name, status, details, timestamp: new Date().toISOString() });
    results.summary.total++;
    if (status === 'PASS') results.summary.pass++;
    else results.summary.fail++;

    const icon = status === 'PASS' ? '✅' : '❌';
    console.log(`${icon} ${name}: ${status}`);
    if (Object.keys(details).length > 0) {
        console.log(`   Details:`, JSON.stringify(details, null, 2));
    }
}

async function createTestUser() {
    console.log('\n🔍 Creating test user via Admin API...');
    try {
        const supabase = createClient(supabaseUrl, supabaseServiceKey, {
            auth: {
                autoRefreshToken: false,
                persistSession: false
            }
        });

        // Delete user if exists (cleanup from previous runs)
        try {
            const { data: existingUsers } = await supabase.auth.admin.listUsers();
            const existing = existingUsers?.users?.find(u => u.email === TEST_USER.email);
            if (existing) {
                console.log(`   ⚠️  User ${TEST_USER.email} already exists, deleting...`);
                await supabase.auth.admin.deleteUser(existing.id);
                console.log(`   ✓ Deleted existing user`);
            }
        } catch (cleanupErr) {
            console.log(`   ⚠️  Cleanup error (non-fatal):`, cleanupErr.message);
        }

        // Create new user
        const { data, error } = await supabase.auth.admin.createUser({
            email: TEST_USER.email,
            password: TEST_USER.password,
            email_confirm: true, // Auto-confirm email
            user_metadata: {
                full_name: TEST_USER.full_name
            }
        });

        if (error) {
            addCheck('CREATE_USER_ADMIN_API', 'FAIL', { error: error.message });
            return null;
        }

        addCheck('CREATE_USER_ADMIN_API', 'PASS', {
            user_id: data.user.id,
            email: data.user.email,
            email_confirmed: data.user.email_confirmed_at ? true : false
        });

        return data.user.id;
    } catch (err) {
        addCheck('CREATE_USER_ADMIN_API', 'FAIL', { error: err.message });
        return null;
    }
}

async function verifyUserExists(userId) {
    console.log('\n🔍 Verifying user exists in auth.users...');
    try {
        const supabase = createClient(supabaseUrl, supabaseServiceKey);

        const { data, error } = await supabase.auth.admin.getUserById(userId);

        if (error) {
            addCheck('VERIFY_USER_EXISTS', 'FAIL', { error: error.message });
            return false;
        }

        addCheck('VERIFY_USER_EXISTS', 'PASS', {
            user_id: data.user.id,
            email: data.user.email,
            created_at: data.user.created_at
        });

        return true;
    } catch (err) {
        addCheck('VERIFY_USER_EXISTS', 'FAIL', { error: err.message });
        return false;
    }
}

async function testLoginFlow() {
    console.log('\n🔍 Testing login flow via Supabase JS SDK...');
    try {
        const supabase = createClient(supabaseUrl, supabaseAnonKey);

        const { data, error } = await supabase.auth.signInWithPassword({
            email: TEST_USER.email,
            password: TEST_USER.password
        });

        if (error) {
            addCheck('LOGIN_FLOW', 'FAIL', { error: error.message });
            return null;
        }

        addCheck('LOGIN_FLOW', 'PASS', {
            user_id: data.user.id,
            email: data.user.email,
            has_access_token: !!data.session?.access_token,
            has_refresh_token: !!data.session?.refresh_token,
            session_expires_at: data.session?.expires_at
        });

        return data.session;
    } catch (err) {
        addCheck('LOGIN_FLOW', 'FAIL', { error: err.message });
        return null;
    }
}

async function verifySessionTokens(session) {
    console.log('\n🔍 Verifying session tokens...');
    try {
        if (!session) {
            addCheck('VERIFY_TOKENS', 'FAIL', { error: 'No session provided' });
            return false;
        }

        const hasAccessToken = !!session.access_token && session.access_token.length > 20;
        const hasRefreshToken = !!session.refresh_token && session.refresh_token.length > 8;
        const hasExpiry = !!session.expires_at;

        if (hasAccessToken && hasRefreshToken && hasExpiry) {
            addCheck('VERIFY_TOKENS', 'PASS', {
                access_token_length: session.access_token.length,
                refresh_token_length: session.refresh_token.length,
                expires_at: session.expires_at,
                expires_in: session.expires_in
            });
            return true;
        } else {
            addCheck('VERIFY_TOKENS', 'FAIL', {
                has_access_token: hasAccessToken,
                has_refresh_token: hasRefreshToken,
                has_expiry: hasExpiry
            });
            return false;
        }
    } catch (err) {
        addCheck('VERIFY_TOKENS', 'FAIL', { error: err.message });
        return false;
    }
}

async function testLogout() {
    console.log('\n🔍 Testing logout and session destruction...');
    try {
        const supabase = createClient(supabaseUrl, supabaseAnonKey);

        // Login first
        const { data: loginData, error: loginError } = await supabase.auth.signInWithPassword({
            email: TEST_USER.email,
            password: TEST_USER.password
        });

        if (loginError) {
            addCheck('LOGOUT_FLOW', 'FAIL', { error: 'Login failed before logout test', details: loginError.message });
            return false;
        }

        // Logout
        const { error: logoutError } = await supabase.auth.signOut();

        if (logoutError) {
            addCheck('LOGOUT_FLOW', 'FAIL', { error: logoutError.message });
            return false;
        }

        // Verify session is destroyed
        const { data: sessionData } = await supabase.auth.getSession();

        if (sessionData.session === null) {
            addCheck('LOGOUT_FLOW', 'PASS', {
                message: 'Session successfully destroyed after logout',
                session_state: 'null'
            });
            return true;
        } else {
            addCheck('LOGOUT_FLOW', 'FAIL', {
                error: 'Session still exists after logout',
                session: sessionData.session
            });
            return false;
        }
    } catch (err) {
        addCheck('LOGOUT_FLOW', 'FAIL', { error: err.message });
        return false;
    }
}

async function runPhase2() {
    console.log('╔════════════════════════════════════════════════════════════════╗');
    console.log('║  PHASE 2: AUTH CANONICAL BOOTSTRAP                             ║');
    console.log('╚════════════════════════════════════════════════════════════════╝\n');

    console.log(`Test User: ${TEST_USER.email}`);
    console.log(`Password: ${TEST_USER.password}\n`);

    const userId = await createTestUser();
    if (!userId) {
        console.error('\n❌ PHASE 2 BLOCKED: Could not create test user');
        fs.writeFileSync('./PHASE2_AUTH_RESULTS.json', JSON.stringify(results, null, 2));
        process.exit(1);
    }

    await verifyUserExists(userId);
    const session = await testLoginFlow();
    await verifySessionTokens(session);
    await testLogout();

    console.log('\n' + '═'.repeat(64));
    console.log(`PHASE 2 SUMMARY: ${results.summary.pass}/${results.summary.total} PASSED`);
    console.log('═'.repeat(64) + '\n');

    // Write results to file
    const outputPath = './PHASE2_AUTH_RESULTS.json';
    fs.writeFileSync(outputPath, JSON.stringify(results, null, 2));
    console.log(`📄 Results written to: ${outputPath}`);

    // Exit with code based on results
    if (results.summary.fail > 0) {
        console.error('\n❌ PHASE 2 FAILED: Auth issues detected');
        process.exit(1);
    } else {
        console.log('\n✅ PHASE 2 PASSED: Auth canonical bootstrap verified');
        console.log(`\n🔑 Test credentials for Phase 3+:`);
        console.log(`   Email: ${TEST_USER.email}`);
        console.log(`   Password: ${TEST_USER.password}`);
        process.exit(0);
    }
}

runPhase2();
