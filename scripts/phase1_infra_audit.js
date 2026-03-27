require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

// ============================================================================
// PHASE 1: INFRASTRUCTURE GROUND TRUTH
// ============================================================================
// Objective: Verify Supabase REST, Auth, Storage connectivity and config
// Output: JSON report with PASS/FAIL for each check
// ============================================================================

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const results = {
    timestamp: new Date().toISOString(),
    phase: 'PHASE_1_INFRASTRUCTURE',
    checks: [],
    summary: { pass: 0, fail: 0, total: 0 }
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

async function verifyRestAPI() {
    console.log('\n🔍 Verifying REST API...');
    try {
        const supabase = createClient(supabaseUrl, supabaseAnonKey);

        // Try to query a table (should fail with proper error if table doesn't exist, but API is reachable)
        const { data, error } = await supabase.from('users').select('count', { count: 'exact', head: true });

        if (error) {
            // Check if error is network-related or API-related
            if (error.message && !error.message.includes('ENOTFOUND') && !error.message.includes('ECONNREFUSED')) {
                addCheck('REST_API_CONNECTIVITY', 'PASS', {
                    message: 'REST API is reachable',
                    error_type: error.code || error.message
                });
            } else {
                addCheck('REST_API_CONNECTIVITY', 'FAIL', { error: error.message });
            }
        } else {
            addCheck('REST_API_CONNECTIVITY', 'PASS', { message: 'REST API is reachable and responsive' });
        }
    } catch (err) {
        addCheck('REST_API_CONNECTIVITY', 'FAIL', { error: err.message });
    }
}

async function verifyAuthAPI() {
    console.log('\n🔍 Verifying Auth API...');
    try {
        const supabase = createClient(supabaseUrl, supabaseAnonKey);

        // Try to get session (should return null for unauthenticated, but API is reachable)
        const { data, error } = await supabase.auth.getSession();

        if (error) {
            addCheck('AUTH_API_CONNECTIVITY', 'FAIL', { error: error.message });
        } else {
            addCheck('AUTH_API_CONNECTIVITY', 'PASS', {
                message: 'Auth API is reachable',
                session_state: data.session ? 'authenticated' : 'unauthenticated'
            });
        }
    } catch (err) {
        addCheck('AUTH_API_CONNECTIVITY', 'FAIL', { error: err.message });
    }
}

async function verifyStorageAPI() {
    console.log('\n🔍 Verifying Storage API...');
    try {
        const supabase = createClient(supabaseUrl, supabaseAnonKey);

        // List buckets (should work even if empty)
        const { data, error } = await supabase.storage.listBuckets();

        if (error) {
            addCheck('STORAGE_API_CONNECTIVITY', 'FAIL', { error: error.message });
        } else {
            addCheck('STORAGE_API_CONNECTIVITY', 'PASS', {
                message: 'Storage API is reachable',
                buckets_count: data ? data.length : 0,
                buckets: data ? data.map(b => b.name) : []
            });
        }
    } catch (err) {
        addCheck('STORAGE_API_CONNECTIVITY', 'FAIL', { error: err.message });
    }
}

async function verifyProjectSettings() {
    console.log('\n🔍 Verifying Project Settings...');
    try {
        const supabase = createClient(supabaseUrl, supabaseServiceKey);

        // Get auth settings via Admin API
        const response = await fetch(`${supabaseUrl}/auth/v1/settings`, {
            headers: {
                'apikey': supabaseServiceKey,
                'Authorization': `Bearer ${supabaseServiceKey}`
            }
        });

        if (!response.ok) {
            addCheck('PROJECT_SETTINGS', 'FAIL', {
                error: `HTTP ${response.status}`,
                message: await response.text()
            });
            return;
        }

        const settings = await response.json();

        addCheck('PROJECT_SETTINGS', 'PASS', {
            auth_enabled: settings.disable_signup === false,
            email_confirmation: settings.mailer_autoconfirm === false ? 'REQUIRED' : 'DISABLED',
            external_providers: settings.external || {}
        });

    } catch (err) {
        addCheck('PROJECT_SETTINGS', 'FAIL', { error: err.message });
    }
}

async function verifyRLSState() {
    console.log('\n🔍 Verifying RLS Default State...');
    try {
        const supabase = createClient(supabaseUrl, supabaseAnonKey);

        // Try to query users table without auth (should fail if RLS is enabled)
        const { data, error } = await supabase.from('users').select('*').limit(1);

        if (error) {
            if (error.code === 'PGRST301' || error.message.includes('permission denied') || error.message.includes('RLS')) {
                addCheck('RLS_DEFAULT_STATE', 'PASS', {
                    message: 'RLS appears to be enabled (unauthenticated query blocked)',
                    error_code: error.code
                });
            } else if (error.code === '42P01' || error.message.includes('does not exist')) {
                addCheck('RLS_DEFAULT_STATE', 'UNKNOWN', {
                    message: 'Table does not exist yet',
                    error_code: error.code
                });
            } else {
                addCheck('RLS_DEFAULT_STATE', 'UNKNOWN', {
                    message: 'Unexpected error',
                    error: error.message
                });
            }
        } else {
            addCheck('RLS_DEFAULT_STATE', 'FAIL', {
                message: 'RLS may be disabled (unauthenticated query succeeded)',
                rows_returned: data ? data.length : 0
            });
        }
    } catch (err) {
        addCheck('RLS_DEFAULT_STATE', 'FAIL', { error: err.message });
    }
}

async function runPhase1() {
    console.log('╔════════════════════════════════════════════════════════════════╗');
    console.log('║  PHASE 1: INFRASTRUCTURE GROUND TRUTH                          ║');
    console.log('╚════════════════════════════════════════════════════════════════╝\n');

    console.log(`Supabase URL: ${supabaseUrl}`);
    console.log(`Anon Key: ${supabaseAnonKey ? supabaseAnonKey.substring(0, 20) + '...' : 'MISSING'}`);
    console.log(`Service Key: ${supabaseServiceKey ? supabaseServiceKey.substring(0, 20) + '...' : 'MISSING'}\n`);

    await verifyRestAPI();
    await verifyAuthAPI();
    await verifyStorageAPI();
    await verifyProjectSettings();
    await verifyRLSState();

    console.log('\n' + '═'.repeat(64));
    console.log(`PHASE 1 SUMMARY: ${results.summary.pass}/${results.summary.total} PASSED`);
    console.log('═'.repeat(64) + '\n');

    // Write results to file
    const outputPath = './PHASE1_INFRASTRUCTURE_RESULTS.json';
    fs.writeFileSync(outputPath, JSON.stringify(results, null, 2));
    console.log(`📄 Results written to: ${outputPath}`);

    // Exit with code based on results
    if (results.summary.fail > 0) {
        console.error('\n❌ PHASE 1 FAILED: Infrastructure issues detected');
        process.exit(1);
    } else {
        console.log('\n✅ PHASE 1 PASSED: Infrastructure verified');
        process.exit(0);
    }
}

runPhase1();
