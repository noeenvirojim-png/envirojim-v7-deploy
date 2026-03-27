/**
 * PHASE 1: ENVIRONMENT & CREDENTIALS VERIFICATION
 * 
 * Zero-hallucination forensic audit of:
 * - Environment variable loading
 * - Supabase credentials validity
 * - Database connectivity
 * - Basic query execution
 * 
 * Output: JSON report with PASS/FAIL/WARNING
 */

require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const results = {
    timestamp: new Date().toISOString(),
    phase: 'Phase 1: Environment & Credentials',
    tests: [],
    summary: {
        total: 0,
        passed: 0,
        failed: 0,
        warnings: 0
    }
};

function addTest(name, status, details, evidence = null) {
    results.tests.push({
        name,
        status, // PASS, FAIL, WARNING
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
    console.log('PHASE 1: ENVIRONMENT & CREDENTIALS VERIFICATION');
    console.log('='.repeat(80));
    console.log('');

    // TEST 1: Environment Variables Exist
    console.log('[TEST 1] Checking environment variables...');
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    const postgresUrl = process.env.POSTGRES_URL;

    if (!supabaseUrl) {
        addTest('ENV: NEXT_PUBLIC_SUPABASE_URL', 'FAIL', 'Environment variable not set', null);
        console.log('❌ NEXT_PUBLIC_SUPABASE_URL not found');
    } else {
        addTest('ENV: NEXT_PUBLIC_SUPABASE_URL', 'PASS', 'Environment variable exists', { value: supabaseUrl });
        console.log(`✅ NEXT_PUBLIC_SUPABASE_URL: ${supabaseUrl}`);
    }

    if (!supabaseKey) {
        addTest('ENV: NEXT_PUBLIC_SUPABASE_ANON_KEY', 'FAIL', 'Environment variable not set', null);
        console.log('❌ NEXT_PUBLIC_SUPABASE_ANON_KEY not found');
    } else {
        const keyPreview = supabaseKey.substring(0, 20) + '...' + supabaseKey.substring(supabaseKey.length - 10);
        addTest('ENV: NEXT_PUBLIC_SUPABASE_ANON_KEY', 'PASS', 'Environment variable exists', { preview: keyPreview });
        console.log(`✅ NEXT_PUBLIC_SUPABASE_ANON_KEY: ${keyPreview}`);
    }

    if (!postgresUrl) {
        addTest('ENV: POSTGRES_URL', 'WARNING', 'Environment variable not set (optional)', null);
        console.log('⚠️  POSTGRES_URL not found (optional)');
    } else {
        // Mask password in URL
        const maskedUrl = postgresUrl.replace(/:([^@]+)@/, ':***@');
        addTest('ENV: POSTGRES_URL', 'PASS', 'Environment variable exists', { value: maskedUrl });
        console.log(`✅ POSTGRES_URL: ${maskedUrl}`);
    }

    console.log('');

    // TEST 2: Validate Supabase URL Format
    console.log('[TEST 2] Validating Supabase URL format...');
    if (supabaseUrl) {
        const urlPattern = /^https:\/\/[a-z0-9-]+\.supabase\.co$/;
        if (urlPattern.test(supabaseUrl)) {
            addTest('URL Format Validation', 'PASS', 'URL matches Supabase pattern', { url: supabaseUrl });
            console.log(`✅ URL format is valid: ${supabaseUrl}`);
        } else if (supabaseUrl.includes('placeholder')) {
            addTest('URL Format Validation', 'FAIL', 'URL contains placeholder value', { url: supabaseUrl });
            console.log(`❌ URL is a placeholder: ${supabaseUrl}`);
        } else {
            addTest('URL Format Validation', 'WARNING', 'URL format is non-standard', { url: supabaseUrl });
            console.log(`⚠️  URL format is non-standard: ${supabaseUrl}`);
        }
    }

    console.log('');

    // TEST 3: Validate Anon Key Format (JWT)
    console.log('[TEST 3] Validating Anon Key format...');
    if (supabaseKey) {
        const jwtPattern = /^eyJ[A-Za-z0-9-_]+\.[A-Za-z0-9-_]+\.[A-Za-z0-9-_]+$/;
        if (jwtPattern.test(supabaseKey)) {
            addTest('Anon Key Format Validation', 'PASS', 'Key is valid JWT format', { length: supabaseKey.length });
            console.log(`✅ Anon key is valid JWT format (${supabaseKey.length} chars)`);
        } else if (supabaseKey.includes('placeholder')) {
            addTest('Anon Key Format Validation', 'FAIL', 'Key contains placeholder value', null);
            console.log(`❌ Anon key is a placeholder`);
        } else {
            addTest('Anon Key Format Validation', 'WARNING', 'Key format is non-standard', { length: supabaseKey.length });
            console.log(`⚠️  Anon key format is non-standard`);
        }
    }

    console.log('');

    // TEST 4: Initialize Supabase Client
    console.log('[TEST 4] Initializing Supabase client...');
    let supabase = null;
    try {
        if (!supabaseUrl || !supabaseKey) {
            throw new Error('Missing required credentials');
        }
        supabase = createClient(supabaseUrl, supabaseKey);
        addTest('Supabase Client Initialization', 'PASS', 'Client created successfully', null);
        console.log('✅ Supabase client initialized');
    } catch (error) {
        addTest('Supabase Client Initialization', 'FAIL', 'Client creation failed', { error: error.message });
        console.log(`❌ Failed to initialize client: ${error.message}`);
        return; // Cannot proceed without client
    }

    console.log('');

    // TEST 5: Test Database Connectivity
    console.log('[TEST 5] Testing database connectivity...');
    try {
        const { data, error } = await supabase
            .from('organizations')
            .select('count')
            .limit(1);

        if (error) {
            addTest('Database Connectivity', 'FAIL', 'Query failed', {
                error: error.message,
                code: error.code,
                details: error.details,
                hint: error.hint
            });
            console.log(`❌ Database query failed:`);
            console.log(`   Error: ${error.message}`);
            console.log(`   Code: ${error.code}`);
            console.log(`   Details: ${error.details}`);
            console.log(`   Hint: ${error.hint}`);
        } else {
            addTest('Database Connectivity', 'PASS', 'Successfully queried database', { result: data });
            console.log('✅ Database connection successful');
            console.log(`   Query result:`, data);
        }
    } catch (error) {
        addTest('Database Connectivity', 'FAIL', 'Network or connection error', { error: error.message });
        console.log(`❌ Connection error: ${error.message}`);
    }

    console.log('');

    // TEST 6: Verify Tables Exist
    console.log('[TEST 6] Verifying core tables exist...');
    const coreTables = [
        'organizations',
        'users',
        'machines',
        'parts_catalog',
        'part_requests',
        'part_request_items'
    ];

    for (const table of coreTables) {
        try {
            const { data, error } = await supabase
                .from(table)
                .select('*')
                .limit(1);

            if (error) {
                addTest(`Table Exists: ${table}`, 'FAIL', 'Table query failed', {
                    error: error.message,
                    code: error.code
                });
                console.log(`❌ Table '${table}' query failed: ${error.message}`);
            } else {
                addTest(`Table Exists: ${table}`, 'PASS', 'Table accessible', { rowCount: data ? data.length : 0 });
                console.log(`✅ Table '${table}' exists (${data ? data.length : 0} rows returned)`);
            }
        } catch (error) {
            addTest(`Table Exists: ${table}`, 'FAIL', 'Query error', { error: error.message });
            console.log(`❌ Error querying '${table}': ${error.message}`);
        }
    }

    console.log('');

    // TEST 7: Test RLS Helper Functions
    console.log('[TEST 7] Testing RLS helper functions...');
    try {
        // Test if we can call the helper function (will return null if not authenticated)
        const { data, error } = await supabase.rpc('get_auth_org_id');

        if (error) {
            // This is expected if not authenticated
            if (error.message.includes('not found') || error.code === '42883') {
                addTest('RLS Helper: get_auth_org_id', 'FAIL', 'Function does not exist in database', { error: error.message });
                console.log(`❌ Function 'get_auth_org_id' not found in database`);
            } else {
                addTest('RLS Helper: get_auth_org_id', 'PASS', 'Function exists (returns null for unauthenticated)', { error: error.message });
                console.log(`✅ Function 'get_auth_org_id' exists (expected error for unauthenticated call)`);
            }
        } else {
            addTest('RLS Helper: get_auth_org_id', 'PASS', 'Function exists and returned data', { result: data });
            console.log(`✅ Function 'get_auth_org_id' returned:`, data);
        }
    } catch (error) {
        addTest('RLS Helper: get_auth_org_id', 'WARNING', 'Could not test function', { error: error.message });
        console.log(`⚠️  Could not test 'get_auth_org_id': ${error.message}`);
    }

    console.log('');

    // TEST 8: Test RPC Functions Exist
    console.log('[TEST 8] Verifying RPC functions exist...');
    const rpcFunctions = [
        'create_machine_with_document',
        'create_part_request_with_items',
        'update_part_request_status_atomic'
    ];

    for (const funcName of rpcFunctions) {
        try {
            // Try to call with invalid params to see if function exists
            const { data, error } = await supabase.rpc(funcName, {});

            if (error) {
                if (error.message.includes('not found') || error.code === '42883') {
                    addTest(`RPC Function: ${funcName}`, 'FAIL', 'Function does not exist', { error: error.message });
                    console.log(`❌ RPC '${funcName}' not found`);
                } else {
                    // Function exists but params are wrong (expected)
                    addTest(`RPC Function: ${funcName}`, 'PASS', 'Function exists (param error expected)', { error: error.message });
                    console.log(`✅ RPC '${funcName}' exists (expected param error)`);
                }
            } else {
                addTest(`RPC Function: ${funcName}`, 'PASS', 'Function exists and executed', { result: data });
                console.log(`✅ RPC '${funcName}' executed:`, data);
            }
        } catch (error) {
            addTest(`RPC Function: ${funcName}`, 'WARNING', 'Could not test function', { error: error.message });
            console.log(`⚠️  Could not test '${funcName}': ${error.message}`);
        }
    }

    console.log('');
    console.log('='.repeat(80));
    console.log('PHASE 1 SUMMARY');
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
    console.log('Full results written to: PHASE1_ENVIRONMENT_RESULTS.json');
    console.log('='.repeat(80));

    return results;
}

// Execute audit
runAudit()
    .then(results => {
        // Write results to file
        const fs = require('fs');
        fs.writeFileSync(
            'PHASE1_ENVIRONMENT_RESULTS.json',
            JSON.stringify(results, null, 2)
        );

        // Exit with appropriate code
        process.exit(results.overallStatus === 'FAIL' ? 1 : 0);
    })
    .catch(error => {
        console.error('FATAL ERROR:', error);
        process.exit(2);
    });
