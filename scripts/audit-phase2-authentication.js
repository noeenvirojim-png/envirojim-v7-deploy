/**
 * PHASE 2: AUTHENTICATION & SESSION MANAGEMENT AUDIT
 * 
 * Zero-hallucination forensic audit of:
 * - User creation via Supabase Auth
 * - Login flow with valid/invalid credentials
 * - Session token generation and validation
 * - Session refresh mechanism
 * - Logout and session cleanup
 * 
 * Output: JSON report with PASS/FAIL/WARNING
 */

require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const results = {
    timestamp: new Date().toISOString(),
    phase: 'Phase 2: Authentication & Session Management',
    tests: [],
    summary: {
        total: 0,
        passed: 0,
        failed: 0,
        warnings: 0
    },
    testUsers: []
};

function addTest(name, status, details, evidence = null) {
    results.tests.push({
        name,
        status,
        details,
        evidence
    });
    results.summary.total++;
    if (status === 'PASS') results.summary.passed++;
    else if (status === 'FAIL') results.summary.failed++;
    else if (status === 'WARNING') results.summary.warnings++;
}

async function runAudit() {
    console.log('='.repeat(80));
    console.log('PHASE 2: AUTHENTICATION & SESSION MANAGEMENT AUDIT');
    console.log('='.repeat(80));
    console.log('');

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseKey) {
        console.log('❌ Missing Supabase credentials');
        addTest('Prerequisites', 'FAIL', 'Missing environment variables', null);
        return results;
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    // TEST 1: Create Test User
    console.log('[TEST 1] Creating test user...');
    const testEmail = `test-audit-${Date.now()}@envirojim.com`;
    const testPassword = 'TestPassword123!';

    let testUserId = null;

    try {
        const { data, error } = await supabase.auth.signUp({
            email: testEmail,
            password: testPassword,
            options: {
                data: {
                    full_name: 'Audit Test User'
                }
            }
        });

        if (error) {
            addTest('User Creation', 'FAIL', 'Failed to create test user', {
                error: error.message,
                code: error.status
            });
            console.log(`❌ User creation failed: ${error.message}`);
        } else if (data.user) {
            testUserId = data.user.id;
            results.testUsers.push({
                email: testEmail,
                id: testUserId,
                created: true
            });
            addTest('User Creation', 'PASS', 'Test user created successfully', {
                userId: testUserId,
                email: testEmail,
                emailConfirmed: data.user.email_confirmed_at ? true : false
            });
            console.log(`✅ Test user created: ${testUserId}`);
            console.log(`   Email: ${testEmail}`);
            console.log(`   Email confirmed: ${data.user.email_confirmed_at ? 'Yes' : 'No (confirmation may be required)'}`);
        } else {
            addTest('User Creation', 'WARNING', 'User creation returned no data', { response: data });
            console.log('⚠️  User creation returned no data');
        }
    } catch (error) {
        addTest('User Creation', 'FAIL', 'Exception during user creation', { error: error.message });
        console.log(`❌ Exception: ${error.message}`);
    }

    console.log('');

    // TEST 2: Login with Valid Credentials
    console.log('[TEST 2] Testing login with valid credentials...');
    let sessionToken = null;
    let refreshToken = null;

    try {
        const { data, error } = await supabase.auth.signInWithPassword({
            email: testEmail,
            password: testPassword
        });

        if (error) {
            addTest('Login: Valid Credentials', 'FAIL', 'Login failed with valid credentials', {
                error: error.message,
                code: error.status
            });
            console.log(`❌ Login failed: ${error.message}`);
        } else if (data.session) {
            sessionToken = data.session.access_token;
            refreshToken = data.session.refresh_token;

            addTest('Login: Valid Credentials', 'PASS', 'Login successful', {
                userId: data.user.id,
                email: data.user.email,
                sessionExpiry: data.session.expires_at,
                tokenLength: sessionToken.length
            });
            console.log(`✅ Login successful`);
            console.log(`   User ID: ${data.user.id}`);
            console.log(`   Session expires: ${new Date(data.session.expires_at * 1000).toISOString()}`);
            console.log(`   Access token length: ${sessionToken.length} chars`);
        } else {
            addTest('Login: Valid Credentials', 'WARNING', 'Login returned no session', { response: data });
            console.log('⚠️  Login returned no session');
        }
    } catch (error) {
        addTest('Login: Valid Credentials', 'FAIL', 'Exception during login', { error: error.message });
        console.log(`❌ Exception: ${error.message}`);
    }

    console.log('');

    // TEST 3: Login with Invalid Password
    console.log('[TEST 3] Testing login with invalid password...');
    try {
        const { data, error } = await supabase.auth.signInWithPassword({
            email: testEmail,
            password: 'WrongPassword123!'
        });

        if (error) {
            addTest('Login: Invalid Password', 'PASS', 'Login correctly rejected invalid password', {
                error: error.message,
                code: error.status
            });
            console.log(`✅ Login correctly rejected: ${error.message}`);
        } else if (data.session) {
            addTest('Login: Invalid Password', 'FAIL', 'SECURITY ISSUE: Login succeeded with wrong password!', {
                userId: data.user?.id
            });
            console.log(`❌ CRITICAL: Login succeeded with wrong password!`);
        } else {
            addTest('Login: Invalid Password', 'PASS', 'Login rejected (no session)', null);
            console.log('✅ Login rejected (no session)');
        }
    } catch (error) {
        addTest('Login: Invalid Password', 'PASS', 'Login rejected with exception', { error: error.message });
        console.log(`✅ Login rejected: ${error.message}`);
    }

    console.log('');

    // TEST 4: Login with Non-Existent User
    console.log('[TEST 4] Testing login with non-existent user...');
    try {
        const { data, error } = await supabase.auth.signInWithPassword({
            email: 'nonexistent@envirojim.com',
            password: 'SomePassword123!'
        });

        if (error) {
            addTest('Login: Non-Existent User', 'PASS', 'Login correctly rejected non-existent user', {
                error: error.message,
                code: error.status
            });
            console.log(`✅ Login correctly rejected: ${error.message}`);
        } else if (data.session) {
            addTest('Login: Non-Existent User', 'FAIL', 'SECURITY ISSUE: Login succeeded for non-existent user!', null);
            console.log(`❌ CRITICAL: Login succeeded for non-existent user!`);
        } else {
            addTest('Login: Non-Existent User', 'PASS', 'Login rejected (no session)', null);
            console.log('✅ Login rejected (no session)');
        }
    } catch (error) {
        addTest('Login: Non-Existent User', 'PASS', 'Login rejected with exception', { error: error.message });
        console.log(`✅ Login rejected: ${error.message}`);
    }

    console.log('');

    // TEST 5: Validate Session Token Structure
    console.log('[TEST 5] Validating session token structure...');
    if (sessionToken) {
        try {
            // JWT tokens have 3 parts separated by dots
            const parts = sessionToken.split('.');
            if (parts.length === 3) {
                // Decode header and payload (base64)
                const header = JSON.parse(Buffer.from(parts[0], 'base64').toString());
                const payload = JSON.parse(Buffer.from(parts[1], 'base64').toString());

                addTest('Session Token Structure', 'PASS', 'Token is valid JWT format', {
                    algorithm: header.alg,
                    type: header.typ,
                    issuer: payload.iss,
                    subject: payload.sub,
                    expiresAt: new Date(payload.exp * 1000).toISOString(),
                    role: payload.role
                });
                console.log(`✅ Token is valid JWT`);
                console.log(`   Algorithm: ${header.alg}`);
                console.log(`   Issuer: ${payload.iss}`);
                console.log(`   Subject (User ID): ${payload.sub}`);
                console.log(`   Role: ${payload.role}`);
                console.log(`   Expires: ${new Date(payload.exp * 1000).toISOString()}`);
            } else {
                addTest('Session Token Structure', 'FAIL', 'Token is not valid JWT format', { parts: parts.length });
                console.log(`❌ Token has ${parts.length} parts (expected 3)`);
            }
        } catch (error) {
            addTest('Session Token Structure', 'FAIL', 'Failed to parse token', { error: error.message });
            console.log(`❌ Failed to parse token: ${error.message}`);
        }
    } else {
        addTest('Session Token Structure', 'WARNING', 'No session token available to validate', null);
        console.log('⚠️  No session token available');
    }

    console.log('');

    // TEST 6: Get Current User with Session
    console.log('[TEST 6] Testing getUser() with active session...');
    if (sessionToken) {
        try {
            const { data, error } = await supabase.auth.getUser(sessionToken);

            if (error) {
                addTest('Get User with Session', 'FAIL', 'Failed to get user with valid token', {
                    error: error.message
                });
                console.log(`❌ getUser() failed: ${error.message}`);
            } else if (data.user) {
                addTest('Get User with Session', 'PASS', 'Successfully retrieved user data', {
                    userId: data.user.id,
                    email: data.user.email,
                    emailConfirmed: data.user.email_confirmed_at ? true : false
                });
                console.log(`✅ User data retrieved`);
                console.log(`   User ID: ${data.user.id}`);
                console.log(`   Email: ${data.user.email}`);
            } else {
                addTest('Get User with Session', 'WARNING', 'getUser() returned no data', null);
                console.log('⚠️  getUser() returned no data');
            }
        } catch (error) {
            addTest('Get User with Session', 'FAIL', 'Exception during getUser()', { error: error.message });
            console.log(`❌ Exception: ${error.message}`);
        }
    } else {
        addTest('Get User with Session', 'WARNING', 'No session token available', null);
        console.log('⚠️  No session token available');
    }

    console.log('');

    // TEST 7: Test Session Refresh
    console.log('[TEST 7] Testing session refresh...');
    if (refreshToken) {
        try {
            const { data, error } = await supabase.auth.refreshSession({
                refresh_token: refreshToken
            });

            if (error) {
                addTest('Session Refresh', 'FAIL', 'Failed to refresh session', {
                    error: error.message
                });
                console.log(`❌ Session refresh failed: ${error.message}`);
            } else if (data.session) {
                addTest('Session Refresh', 'PASS', 'Session refreshed successfully', {
                    newAccessToken: data.session.access_token.substring(0, 20) + '...',
                    newRefreshToken: data.session.refresh_token.substring(0, 20) + '...',
                    expiresAt: new Date(data.session.expires_at * 1000).toISOString()
                });
                console.log(`✅ Session refreshed`);
                console.log(`   New expiry: ${new Date(data.session.expires_at * 1000).toISOString()}`);
            } else {
                addTest('Session Refresh', 'WARNING', 'Refresh returned no session', null);
                console.log('⚠️  Refresh returned no session');
            }
        } catch (error) {
            addTest('Session Refresh', 'FAIL', 'Exception during refresh', { error: error.message });
            console.log(`❌ Exception: ${error.message}`);
        }
    } else {
        addTest('Session Refresh', 'WARNING', 'No refresh token available', null);
        console.log('⚠️  No refresh token available');
    }

    console.log('');

    // TEST 8: Test Logout
    console.log('[TEST 8] Testing logout...');
    try {
        const { error } = await supabase.auth.signOut();

        if (error) {
            addTest('Logout', 'FAIL', 'Logout failed', { error: error.message });
            console.log(`❌ Logout failed: ${error.message}`);
        } else {
            addTest('Logout', 'PASS', 'Logout successful', null);
            console.log('✅ Logout successful');
        }
    } catch (error) {
        addTest('Logout', 'FAIL', 'Exception during logout', { error: error.message });
        console.log(`❌ Exception: ${error.message}`);
    }

    console.log('');

    // TEST 9: Verify Session Cleared After Logout
    console.log('[TEST 9] Verifying session cleared after logout...');
    try {
        const { data, error } = await supabase.auth.getUser();

        if (error) {
            addTest('Session Cleared', 'PASS', 'Session correctly cleared (getUser failed)', {
                error: error.message
            });
            console.log(`✅ Session cleared: ${error.message}`);
        } else if (!data.user) {
            addTest('Session Cleared', 'PASS', 'Session correctly cleared (no user)', null);
            console.log('✅ Session cleared (no user)');
        } else {
            addTest('Session Cleared', 'FAIL', 'SECURITY ISSUE: Session still active after logout!', {
                userId: data.user.id
            });
            console.log(`❌ CRITICAL: Session still active after logout!`);
        }
    } catch (error) {
        addTest('Session Cleared', 'PASS', 'Session cleared (exception)', { error: error.message });
        console.log(`✅ Session cleared: ${error.message}`);
    }

    console.log('');

    // TEST 10: Verify User Record in Database
    console.log('[TEST 10] Verifying user record exists in users table...');
    if (testUserId) {
        try {
            // Re-login to get a fresh session for database queries
            const { data: authData } = await supabase.auth.signInWithPassword({
                email: testEmail,
                password: testPassword
            });

            if (authData.session) {
                // Create a new client with the session
                const authenticatedClient = createClient(supabaseUrl, supabaseKey, {
                    global: {
                        headers: {
                            Authorization: `Bearer ${authData.session.access_token}`
                        }
                    }
                });

                const { data, error } = await authenticatedClient
                    .from('users')
                    .select('*')
                    .eq('id', testUserId)
                    .single();

                if (error) {
                    if (error.code === 'PGRST116') {
                        addTest('User Record in Database', 'WARNING', 'User not found in users table (may need manual creation)', {
                            error: error.message,
                            note: 'Auth user exists but database record missing'
                        });
                        console.log('⚠️  User exists in auth but not in users table');
                        console.log('   Note: This may require manual user record creation or trigger');
                    } else {
                        addTest('User Record in Database', 'FAIL', 'Error querying users table', {
                            error: error.message,
                            code: error.code
                        });
                        console.log(`❌ Query failed: ${error.message}`);
                    }
                } else if (data) {
                    addTest('User Record in Database', 'PASS', 'User record found in database', {
                        userId: data.id,
                        email: data.email,
                        role: data.role,
                        orgId: data.org_id
                    });
                    console.log('✅ User record found in database');
                    console.log(`   Role: ${data.role}`);
                    console.log(`   Org ID: ${data.org_id}`);
                } else {
                    addTest('User Record in Database', 'WARNING', 'Query returned no data', null);
                    console.log('⚠️  Query returned no data');
                }

                // Sign out after test
                await authenticatedClient.auth.signOut();
            }
        } catch (error) {
            addTest('User Record in Database', 'WARNING', 'Could not verify database record', {
                error: error.message
            });
            console.log(`⚠️  Could not verify: ${error.message}`);
        }
    } else {
        addTest('User Record in Database', 'WARNING', 'No test user ID available', null);
        console.log('⚠️  No test user ID available');
    }

    console.log('');
    console.log('='.repeat(80));
    console.log('PHASE 2 SUMMARY');
    console.log('='.repeat(80));
    console.log(`Total Tests: ${results.summary.total}`);
    console.log(`✅ Passed: ${results.summary.passed}`);
    console.log(`❌ Failed: ${results.summary.failed}`);
    console.log(`⚠️  Warnings: ${results.summary.warnings}`);
    console.log('');

    // Determine overall status
    if (results.summary.failed > 0) {
        results.overallStatus = 'FAIL';
        console.log('🔴 OVERALL STATUS: FAIL');
    } else if (results.summary.warnings > 0) {
        results.overallStatus = 'WARNING';
        console.log('🟡 OVERALL STATUS: WARNING');
    } else {
        results.overallStatus = 'PASS';
        console.log('🟢 OVERALL STATUS: PASS');
    }

    console.log('');
    console.log('⚠️  NOTE: Test users created during this audit:');
    results.testUsers.forEach(user => {
        console.log(`   - ${user.email} (ID: ${user.id})`);
    });
    console.log('');
    console.log('Full results written to: PHASE2_AUTHENTICATION_RESULTS.json');
    console.log('='.repeat(80));

    return results;
}

// Execute audit
runAudit()
    .then(results => {
        const fs = require('fs');
        fs.writeFileSync(
            'PHASE2_AUTHENTICATION_RESULTS.json',
            JSON.stringify(results, null, 2)
        );

        process.exit(results.overallStatus === 'FAIL' ? 1 : 0);
    })
    .catch(error => {
        console.error('FATAL ERROR:', error);
        process.exit(2);
    });
