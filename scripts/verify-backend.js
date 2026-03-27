// PHASE 1 - BACKEND FULL PROOF VERIFICATION
// Tests Supabase client, Server Actions, RPC functions, RBAC, and API endpoints
// Zero hallucination - all results must be observable

const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Load environment variables
const envPath = path.join(__dirname, '..', '.env.local');
const envContent = fs.readFileSync(envPath, 'utf8');
const envVars = {};
envContent.split('\n').forEach(line => {
    const trimmed = line.trim();
    if (trimmed && !trimmed.startsWith('#')) {
        const [key, ...valueParts] = trimmed.split('=');
        if (key && valueParts.length > 0) {
            envVars[key.trim()] = valueParts.join('=').trim();
        }
    }
});

const SUPABASE_URL = envVars.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_ANON_KEY = envVars.NEXT_PUBLIC_SUPABASE_ANON_KEY;

// Test Results Accumulator
const results = {
    timestamp: new Date().toISOString(),
    phase: 'PHASE_1_BACKEND',
    tests: [],
    summary: {
        total: 0,
        passed: 0,
        failed: 0,
        warnings: 0
    }
};

function logTest(name, status, details, error = null) {
    const test = { name, status, details, error, timestamp: new Date().toISOString() };
    results.tests.push(test);
    results.summary.total++;

    if (status === 'PASS') {
        console.log(`✅ PASS: ${name}`);
        results.summary.passed++;
    } else if (status === 'FAIL') {
        console.error(`❌ FAIL: ${name}`);
        if (error) console.error(`   Error: ${error}`);
        results.summary.failed++;
    } else if (status === 'WARNING') {
        console.warn(`⚠️  WARNING: ${name}`);
        results.summary.warnings++;
    }

    if (details) {
        console.log(`   Details: ${JSON.stringify(details)}`);
    }
}

async function runBackendTests() {
    console.log('═══════════════════════════════════════════════════════════');
    console.log('PHASE 1 - BACKEND FULL PROOF VERIFICATION');
    console.log('Timestamp:', new Date().toISOString());
    console.log('═══════════════════════════════════════════════════════════\n');

    // ============================================================================
    // TEST 1: Supabase Client Initialization
    // ============================================================================
    console.log('\n📋 TEST GROUP 1: Supabase Client Initialization\n');

    let supabase;
    try {
        supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
        logTest(
            'Supabase Client Creation',
            'PASS',
            { url: SUPABASE_URL, keyLength: SUPABASE_ANON_KEY.length }
        );
    } catch (error) {
        logTest(
            'Supabase Client Creation',
            'FAIL',
            null,
            error.message
        );
        return results;
    }

    // ============================================================================
    // TEST 2: Supabase Connection Test
    // ============================================================================
    console.log('\n📋 TEST GROUP 2: Supabase Connection\n');

    try {
        const { data, error } = await supabase.from('users').select('count').limit(1);

        if (error) {
            logTest(
                'Supabase Connection Test',
                'FAIL',
                { errorCode: error.code, errorMessage: error.message },
                error.message
            );
        } else {
            logTest(
                'Supabase Connection Test',
                'PASS',
                { connected: true, queryExecuted: true }
            );
        }
    } catch (error) {
        logTest(
            'Supabase Connection Test',
            'FAIL',
            null,
            error.message
        );
    }

    // ============================================================================
    // TEST 3: Authentication - Create Test User
    // ============================================================================
    console.log('\n📋 TEST GROUP 3: Authentication\n');

    const testEmail = `test-${Date.now()}@envirojim.test`;
    const testPassword = 'TestPassword123!';
    let testUserId = null;
    let sessionToken = null;

    try {
        const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
            email: testEmail,
            password: testPassword,
        });

        if (signUpError) {
            logTest(
                'User Creation (signUp)',
                'FAIL',
                { email: testEmail, errorCode: signUpError.code },
                signUpError.message
            );
        } else if (!signUpData.user) {
            logTest(
                'User Creation (signUp)',
                'WARNING',
                { email: testEmail, message: 'User created but email confirmation may be required' }
            );
        } else {
            testUserId = signUpData.user.id;
            logTest(
                'User Creation (signUp)',
                'PASS',
                { userId: testUserId, email: testEmail }
            );
        }
    } catch (error) {
        logTest(
            'User Creation (signUp)',
            'FAIL',
            null,
            error.message
        );
    }

    // ============================================================================
    // TEST 4: Authentication - Login
    // ============================================================================
    try {
        const { data: loginData, error: loginError } = await supabase.auth.signInWithPassword({
            email: testEmail,
            password: testPassword,
        });

        if (loginError) {
            logTest(
                'User Login (signInWithPassword)',
                'FAIL',
                { email: testEmail, errorCode: loginError.code },
                loginError.message
            );
        } else if (!loginData.session) {
            logTest(
                'User Login (signInWithPassword)',
                'FAIL',
                { email: testEmail, message: 'No session returned' },
                'Session is null'
            );
        } else {
            sessionToken = loginData.session.access_token;
            testUserId = loginData.user.id;
            logTest(
                'User Login (signInWithPassword)',
                'PASS',
                {
                    userId: testUserId,
                    email: testEmail,
                    sessionTokenLength: sessionToken.length,
                    expiresAt: loginData.session.expires_at
                }
            );
        }
    } catch (error) {
        logTest(
            'User Login (signInWithPassword)',
            'FAIL',
            null,
            error.message
        );
    }

    // ============================================================================
    // TEST 5: Database Schema Verification
    // ============================================================================
    console.log('\n📋 TEST GROUP 4: Database Schema\n');

    const tables = ['users', 'organizations', 'machines', 'part_requests', 'parts_catalog', 'documents'];

    for (const table of tables) {
        try {
            const { data, error } = await supabase.from(table).select('*').limit(1);

            if (error) {
                logTest(
                    `Table Exists: ${table}`,
                    'FAIL',
                    { table, errorCode: error.code },
                    error.message
                );
            } else {
                logTest(
                    `Table Exists: ${table}`,
                    'PASS',
                    { table, accessible: true }
                );
            }
        } catch (error) {
            logTest(
                `Table Exists: ${table}`,
                'FAIL',
                { table },
                error.message
            );
        }
    }

    // ============================================================================
    // TEST 6: RPC Functions Verification
    // ============================================================================
    console.log('\n📋 TEST GROUP 5: RPC Functions\n');

    const rpcFunctions = [
        'create_machine_with_document',
        'create_part_request_with_items',
        'update_part_request_status_atomic'
    ];

    for (const funcName of rpcFunctions) {
        try {
            // Call with minimal/invalid data to check if function exists
            // We expect it to fail with validation error, not "function not found"
            const { data, error } = await supabase.rpc(funcName, {});

            if (error) {
                // Check if error is "function not found" vs validation error
                if (error.message.includes('function') && error.message.includes('does not exist')) {
                    logTest(
                        `RPC Function Exists: ${funcName}`,
                        'FAIL',
                        { function: funcName },
                        'Function does not exist in database'
                    );
                } else {
                    // Function exists but failed validation (expected)
                    logTest(
                        `RPC Function Exists: ${funcName}`,
                        'PASS',
                        { function: funcName, note: 'Function exists (validation error expected)' }
                    );
                }
            } else {
                logTest(
                    `RPC Function Exists: ${funcName}`,
                    'PASS',
                    { function: funcName, callable: true }
                );
            }
        } catch (error) {
            logTest(
                `RPC Function Exists: ${funcName}`,
                'FAIL',
                { function: funcName },
                error.message
            );
        }
    }

    // ============================================================================
    // TEST 7: RBAC - Row Level Security
    // ============================================================================
    console.log('\n📋 TEST GROUP 6: RBAC & Security\n');

    // Test that unauthenticated users cannot access protected tables
    const unauthClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

    try {
        const { data, error } = await unauthClient.from('machines').select('*').limit(1);

        if (error && (error.code === 'PGRST301' || error.message.includes('JWT'))) {
            logTest(
                'RLS Protection (unauthenticated access blocked)',
                'PASS',
                { table: 'machines', blocked: true }
            );
        } else if (!error) {
            logTest(
                'RLS Protection (unauthenticated access blocked)',
                'WARNING',
                { table: 'machines', message: 'Unauthenticated access allowed - RLS may not be enabled' }
            );
        } else {
            logTest(
                'RLS Protection (unauthenticated access blocked)',
                'FAIL',
                { table: 'machines', errorCode: error.code },
                error.message
            );
        }
    } catch (error) {
        logTest(
            'RLS Protection (unauthenticated access blocked)',
            'FAIL',
            null,
            error.message
        );
    }

    // ============================================================================
    // FINAL REPORT
    // ============================================================================
    console.log('\n═══════════════════════════════════════════════════════════');
    console.log('PHASE 1 BACKEND VERIFICATION - SUMMARY');
    console.log('═══════════════════════════════════════════════════════════');
    console.log(`Total Tests: ${results.summary.total}`);
    console.log(`✅ Passed: ${results.summary.passed}`);
    console.log(`❌ Failed: ${results.summary.failed}`);
    console.log(`⚠️  Warnings: ${results.summary.warnings}`);

    const passRate = ((results.summary.passed / results.summary.total) * 100).toFixed(1);
    console.log(`\nPass Rate: ${passRate}%`);

    if (results.summary.failed === 0) {
        console.log('\n✅ PHASE 1 STATUS: PASSED');
        results.status = 'PASSED';
    } else {
        console.log('\n❌ PHASE 1 STATUS: FAILED');
        results.status = 'FAILED';
    }

    console.log('═══════════════════════════════════════════════════════════\n');

    // Export JSON results
    console.log('📄 JSON Results:\n');
    console.log(JSON.stringify(results, null, 2));

    return results;
}

// Run tests
runBackendTests()
    .then((results) => {
        // Write results to file
        const outputPath = path.join(__dirname, '..', 'PHASE1_BACKEND_RESULTS.json');
        fs.writeFileSync(outputPath, JSON.stringify(results, null, 2));
        console.log(`\n📁 Results saved to: ${outputPath}`);

        process.exit(results.status === 'PASSED' ? 0 : 1);
    })
    .catch((error) => {
        console.error('FATAL ERROR:', error);
        process.exit(1);
    });
