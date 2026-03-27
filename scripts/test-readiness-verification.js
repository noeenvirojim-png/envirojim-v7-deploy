/**
 * TEST READINESS VERIFICATION SCRIPT
 * EnviroJim Platform - Pre-Audit Testability Check
 * 
 * Mode: PARANOID - Zero Hallucination, 100% Proof Required
 * 
 * This script verifies that the platform is fully testable end-to-end
 * before launching the production-grade audit.
 */

import { createClient } from '@supabase/supabase-js';
import http from 'http';
import fs from 'fs';
import path from 'path';

// ANSI color codes for terminal output
const colors = {
    reset: '\x1b[0m',
    green: '\x1b[32m',
    red: '\x1b[31m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
    cyan: '\x1b[36m',
    bold: '\x1b[1m'
};

const results = {
    timestamp: new Date().toISOString(),
    backend: {},
    frontend: {},
    runtime: {},
    testability: {},
    overall: { pass: 0, fail: 0, warning: 0 }
};

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

function log(message, type = 'info') {
    const prefix = {
        pass: `${colors.green}✅ PASS${colors.reset}`,
        fail: `${colors.red}❌ FAIL${colors.reset}`,
        warn: `${colors.yellow}⚠️  WARNING${colors.reset}`,
        info: `${colors.cyan}ℹ️  INFO${colors.reset}`,
        section: `${colors.bold}${colors.blue}═══${colors.reset}`
    };
    console.log(`${prefix[type] || ''} ${message}`);
}

function section(title) {
    console.log(`\n${colors.bold}${colors.blue}${'═'.repeat(80)}${colors.reset}`);
    console.log(`${colors.bold}${colors.blue}  ${title}${colors.reset}`);
    console.log(`${colors.bold}${colors.blue}${'═'.repeat(80)}${colors.reset}\n`);
}

function recordResult(category, testName, status, details = {}) {
    results[category][testName] = { status, ...details };
    results.overall[status]++;
}

// ============================================================================
// BACKEND TEST READINESS
// ============================================================================

async function verifyBackendReadiness() {
    section('BACKEND TEST READINESS');

    // 1. Verify Supabase credentials
    log('Checking Supabase credentials...', 'info');
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseKey) {
        log('Supabase credentials missing', 'fail');
        recordResult('backend', 'credentials', 'fail', {
            error: 'Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY'
        });
        return false;
    }

    log(`Supabase URL: ${supabaseUrl}`, 'pass');
    recordResult('backend', 'credentials', 'pass', { url: supabaseUrl });

    // 2. Test Supabase connection
    log('Testing Supabase connection...', 'info');
    const supabase = createClient(supabaseUrl, supabaseKey);

    try {
        const { data, error } = await supabase.from('organizations').select('count').limit(1);
        if (error) throw error;
        log('Supabase connection successful', 'pass');
        recordResult('backend', 'connection', 'pass');
    } catch (error) {
        log(`Supabase connection failed: ${error.message}`, 'fail');
        recordResult('backend', 'connection', 'fail', { error: error.message });
        return false;
    }

    // 3. Verify core tables are accessible
    log('Verifying core tables accessibility...', 'info');
    const coreTables = ['organizations', 'users', 'machines', 'parts_catalog', 'part_requests', 'part_request_items'];
    const tableResults = {};

    for (const table of coreTables) {
        try {
            const { error } = await supabase.from(table).select('id').limit(1);
            if (error && !error.message.includes('0 rows')) {
                throw error;
            }
            tableResults[table] = 'accessible';
        } catch (error) {
            log(`Table ${table} not accessible: ${error.message}`, 'fail');
            tableResults[table] = `error: ${error.message}`;
            recordResult('backend', `table_${table}`, 'fail', { error: error.message });
            return false;
        }
    }

    log(`All ${coreTables.length} core tables accessible`, 'pass');
    recordResult('backend', 'tables', 'pass', { tables: tableResults });

    // 4. Verify RPC functions exist
    log('Verifying RPC functions...', 'info');
    const rpcFunctions = [
        'create_machine_with_document',
        'create_part_request_with_items',
        'update_part_request_status_atomic'
    ];

    for (const rpcName of rpcFunctions) {
        try {
            // Attempt to call with invalid data to check if function exists
            const { error } = await supabase.rpc(rpcName, {});
            // We expect an error due to invalid params, but not "function does not exist"
            if (error && error.message.includes('does not exist')) {
                throw new Error(`RPC function ${rpcName} does not exist`);
            }
        } catch (error) {
            if (error.message.includes('does not exist')) {
                log(`RPC function ${rpcName} not found`, 'fail');
                recordResult('backend', `rpc_${rpcName}`, 'fail', { error: error.message });
                return false;
            }
        }
    }

    log(`All ${rpcFunctions.length} RPC functions deployed`, 'pass');
    recordResult('backend', 'rpc_functions', 'pass', { functions: rpcFunctions });

    // 5. Test authentication flow
    log('Testing authentication flow...', 'info');
    const testEmail = `test-readiness-${Date.now()}@envirojim.com`;
    const testPassword = 'TestPassword123!';

    try {
        // Attempt to sign up
        const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
            email: testEmail,
            password: testPassword
        });

        if (signUpError) throw signUpError;

        log('User creation successful', 'pass');

        // Attempt to sign in
        const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
            email: testEmail,
            password: testPassword
        });

        if (signInError) {
            if (signInError.message.includes('Email not confirmed')) {
                log('Authentication flow works (email confirmation required)', 'warn');
                recordResult('backend', 'authentication', 'warning', {
                    message: 'Email confirmation required - configure Supabase settings',
                    userId: signUpData.user?.id
                });
            } else {
                throw signInError;
            }
        } else {
            log('Authentication flow fully functional', 'pass');
            recordResult('backend', 'authentication', 'pass', {
                userId: signInData.user?.id,
                sessionToken: signInData.session?.access_token ? 'present' : 'missing'
            });

            // Clean up: sign out
            await supabase.auth.signOut();
        }
    } catch (error) {
        log(`Authentication test failed: ${error.message}`, 'fail');
        recordResult('backend', 'authentication', 'fail', { error: error.message });
        return false;
    }

    // 6. Verify RLS policies are active
    log('Verifying RLS policies are active...', 'info');
    try {
        // Create an unauthenticated client
        const unauthClient = createClient(supabaseUrl, supabaseKey);

        // Try to access protected data without auth
        const { data, error } = await unauthClient.from('users').select('*').limit(1);

        // We expect either no data or an RLS error
        if (data && data.length > 0) {
            log('RLS policies may not be enforced (data accessible without auth)', 'warn');
            recordResult('backend', 'rls', 'warning', { message: 'Data accessible without authentication' });
        } else {
            log('RLS policies active (data protected)', 'pass');
            recordResult('backend', 'rls', 'pass');
        }
    } catch (error) {
        log('RLS verification inconclusive', 'warn');
        recordResult('backend', 'rls', 'warning', { error: error.message });
    }

    return true;
}

// ============================================================================
// FRONTEND TEST READINESS
// ============================================================================

async function verifyFrontendReadiness() {
    section('FRONTEND TEST READINESS');

    // 1. Verify critical pages exist
    log('Checking critical page files...', 'info');
    const criticalPages = [
        'app/login/page.tsx',
        'app/dashboard/page.tsx',
        'app/dashboard/machines/page.tsx',
        'app/dashboard/parts/page.tsx',
        'app/dashboard/layout.tsx'
    ];

    const missingPages = [];
    for (const page of criticalPages) {
        const pagePath = path.join(process.cwd(), page);
        if (!fs.existsSync(pagePath)) {
            missingPages.push(page);
        }
    }

    if (missingPages.length > 0) {
        log(`Missing critical pages: ${missingPages.join(', ')}`, 'fail');
        recordResult('frontend', 'pages', 'fail', { missing: missingPages });
        return false;
    }

    log(`All ${criticalPages.length} critical pages exist`, 'pass');
    recordResult('frontend', 'pages', 'pass', { pages: criticalPages });

    // 2. Verify UI components exist
    log('Checking UI components...', 'info');
    const uiComponents = [
        'components/ui/button.tsx',
        'components/ui/input.tsx',
        'components/ui/card.tsx',
        'components/ui/form.tsx'
    ];

    const missingComponents = [];
    for (const component of uiComponents) {
        const componentPath = path.join(process.cwd(), component);
        if (!fs.existsSync(componentPath)) {
            missingComponents.push(component);
        }
    }

    if (missingComponents.length > 0) {
        log(`Missing UI components: ${missingComponents.join(', ')}`, 'warn');
        recordResult('frontend', 'components', 'warning', { missing: missingComponents });
    } else {
        log(`All ${uiComponents.length} UI components exist`, 'pass');
        recordResult('frontend', 'components', 'pass', { components: uiComponents });
    }

    // 3. Verify middleware protection
    log('Checking middleware configuration...', 'info');
    const middlewarePath = path.join(process.cwd(), 'middleware.ts');

    if (!fs.existsSync(middlewarePath)) {
        log('Middleware file missing', 'fail');
        recordResult('frontend', 'middleware', 'fail', { error: 'middleware.ts not found' });
        return false;
    }

    const middlewareContent = fs.readFileSync(middlewarePath, 'utf-8');
    if (middlewareContent.includes('updateSession') && middlewareContent.includes('/dashboard')) {
        log('Middleware protection configured', 'pass');
        recordResult('frontend', 'middleware', 'pass');
    } else {
        log('Middleware protection may be incomplete', 'warn');
        recordResult('frontend', 'middleware', 'warning', { message: 'Check matcher configuration' });
    }

    // 4. Verify Tailwind configuration
    log('Checking Tailwind configuration...', 'info');
    const tailwindPath = path.join(process.cwd(), 'tailwind.config.ts');

    if (!fs.existsSync(tailwindPath)) {
        log('Tailwind config missing', 'fail');
        recordResult('frontend', 'tailwind', 'fail', { error: 'tailwind.config.ts not found' });
        return false;
    }

    log('Tailwind configuration exists', 'pass');
    recordResult('frontend', 'tailwind', 'pass');

    // 5. Check for broken logout link (known issue from audit)
    log('Checking for logout route handler...', 'info');
    const logoutRoutePath = path.join(process.cwd(), 'app/auth/signout/route.ts');

    if (!fs.existsSync(logoutRoutePath)) {
        log('Logout route handler missing (known issue)', 'warn');
        recordResult('frontend', 'logout', 'warning', {
            message: 'app/auth/signout/route.ts does not exist - logout will fail',
            remediation: 'Create route handler or update Sidebar to use signOut action'
        });
    } else {
        log('Logout route handler exists', 'pass');
        recordResult('frontend', 'logout', 'pass');
    }

    return true;
}

// ============================================================================
// RUNTIME ENVIRONMENT
// ============================================================================

async function verifyRuntimeEnvironment() {
    section('RUNTIME ENVIRONMENT');

    // 1. Check Node.js version
    log('Checking Node.js version...', 'info');
    const nodeVersion = process.version;
    const majorVersion = parseInt(nodeVersion.slice(1).split('.')[0]);

    if (majorVersion < 18) {
        log(`Node.js version ${nodeVersion} is too old (requires >= 18)`, 'fail');
        recordResult('runtime', 'node_version', 'fail', { version: nodeVersion, required: '>=18' });
        return false;
    }

    log(`Node.js version ${nodeVersion} is compatible`, 'pass');
    recordResult('runtime', 'node_version', 'pass', { version: nodeVersion });

    // 2. Check if server is running
    log('Checking if Next.js server is running...', 'info');

    const serverRunning = await new Promise((resolve) => {
        const req = http.get('http://localhost:3000', (res) => {
            resolve(res.statusCode === 200 || res.statusCode === 307);
        });
        req.on('error', () => resolve(false));
        req.setTimeout(5000, () => {
            req.destroy();
            resolve(false);
        });
    });

    if (!serverRunning) {
        log('Next.js server not responding on localhost:3000', 'fail');
        recordResult('runtime', 'server', 'fail', { error: 'Server not running or not accessible' });
        return false;
    }

    log('Next.js server is running and accessible', 'pass');
    recordResult('runtime', 'server', 'pass', { url: 'http://localhost:3000' });

    // 3. Check environment variables
    log('Checking environment variables...', 'info');
    const requiredEnvVars = [
        'NEXT_PUBLIC_SUPABASE_URL',
        'NEXT_PUBLIC_SUPABASE_ANON_KEY'
    ];

    const missingEnvVars = requiredEnvVars.filter(varName => !process.env[varName]);

    if (missingEnvVars.length > 0) {
        log(`Missing environment variables: ${missingEnvVars.join(', ')}`, 'fail');
        recordResult('runtime', 'env_vars', 'fail', { missing: missingEnvVars });
        return false;
    }

    log('All required environment variables are set', 'pass');
    recordResult('runtime', 'env_vars', 'pass', { variables: requiredEnvVars });

    // 4. Check Playwright installation
    log('Checking Playwright installation...', 'info');
    const playwrightConfigPath = path.join(process.cwd(), 'playwright.config.ts');

    if (!fs.existsSync(playwrightConfigPath)) {
        log('Playwright config missing', 'warn');
        recordResult('runtime', 'playwright', 'warning', { error: 'playwright.config.ts not found' });
    } else {
        log('Playwright configuration exists', 'pass');
        recordResult('runtime', 'playwright', 'pass');
    }

    return true;
}

// ============================================================================
// TESTABILITY VALIDATION
// ============================================================================

async function verifyTestability() {
    section('TESTABILITY VALIDATION');

    // 1. Check if E2E tests exist
    log('Checking E2E test files...', 'info');
    const testDir = path.join(process.cwd(), 'tests/e2e');

    if (!fs.existsSync(testDir)) {
        log('E2E test directory missing', 'fail');
        recordResult('testability', 'test_files', 'fail', { error: 'tests/e2e directory not found' });
        return false;
    }

    const testFiles = fs.readdirSync(testDir).filter(file => file.endsWith('.spec.ts'));

    if (testFiles.length === 0) {
        log('No E2E test files found', 'fail');
        recordResult('testability', 'test_files', 'fail', { error: 'No .spec.ts files in tests/e2e' });
        return false;
    }

    log(`Found ${testFiles.length} E2E test files`, 'pass');
    recordResult('testability', 'test_files', 'pass', { count: testFiles.length, files: testFiles });

    // 2. Verify critical flow coverage
    log('Checking critical flow test coverage...', 'info');
    const criticalFlows = {
        'login': false,
        'dashboard': false,
        'crud': false,
        'file_upload': false
    };

    for (const testFile of testFiles) {
        const testContent = fs.readFileSync(path.join(testDir, testFile), 'utf-8');

        if (testContent.includes('login') || testContent.includes('auth')) criticalFlows.login = true;
        if (testContent.includes('dashboard')) criticalFlows.dashboard = true;
        if (testContent.includes('create') && testContent.includes('machine')) criticalFlows.crud = true;
        if (testContent.includes('upload') || testContent.includes('file')) criticalFlows.file_upload = true;
    }

    const missingFlows = Object.entries(criticalFlows)
        .filter(([flow, covered]) => !covered)
        .map(([flow]) => flow);

    if (missingFlows.length > 0) {
        log(`Missing test coverage for: ${missingFlows.join(', ')}`, 'warn');
        recordResult('testability', 'flow_coverage', 'warning', { missing: missingFlows, covered: criticalFlows });
    } else {
        log('All critical flows have test coverage', 'pass');
        recordResult('testability', 'flow_coverage', 'pass', { flows: criticalFlows });
    }

    // 3. Check if tests can be run
    log('Verifying test execution readiness...', 'info');
    const packageJsonPath = path.join(process.cwd(), 'package.json');
    const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf-8'));

    if (!packageJson.scripts || !packageJson.scripts['test:e2e']) {
        log('No test:e2e script defined in package.json', 'fail');
        recordResult('testability', 'test_script', 'fail', { error: 'test:e2e script missing' });
        return false;
    }

    log('Test execution script configured', 'pass');
    recordResult('testability', 'test_script', 'pass', { script: packageJson.scripts['test:e2e'] });

    return true;
}

// ============================================================================
// MAIN EXECUTION
// ============================================================================

async function main() {
    console.log(`${colors.bold}${colors.cyan}`);
    console.log('╔════════════════════════════════════════════════════════════════════════════╗');
    console.log('║                    TEST READINESS VERIFICATION                             ║');
    console.log('║                      EnviroJim Platform                                    ║');
    console.log('║                  Mode: PARANOID - Zero Hallucination                       ║');
    console.log('╚════════════════════════════════════════════════════════════════════════════╝');
    console.log(colors.reset);

    try {
        const backendReady = await verifyBackendReadiness();
        const frontendReady = await verifyFrontendReadiness();
        const runtimeReady = await verifyRuntimeEnvironment();
        const testabilityReady = await verifyTestability();

        // Generate final report
        section('FINAL VERDICT');

        const allReady = backendReady && frontendReady && runtimeReady && testabilityReady;

        console.log(`\n${colors.bold}Test Readiness Summary:${colors.reset}`);
        console.log(`  ✅ Passed:   ${colors.green}${results.overall.pass}${colors.reset}`);
        console.log(`  ❌ Failed:   ${colors.red}${results.overall.fail}${colors.reset}`);
        console.log(`  ⚠️  Warnings: ${colors.yellow}${results.overall.warning}${colors.reset}`);

        if (allReady && results.overall.fail === 0) {
            console.log(`\n${colors.bold}${colors.green}✅ PLATFORM IS FULLY TESTABLE${colors.reset}`);
            console.log(`${colors.green}Ready to proceed with production-grade audit.${colors.reset}`);
        } else if (results.overall.fail === 0 && results.overall.warning > 0) {
            console.log(`\n${colors.bold}${colors.yellow}⚠️  PLATFORM IS TESTABLE WITH WARNINGS${colors.reset}`);
            console.log(`${colors.yellow}Review warnings before proceeding with audit.${colors.reset}`);
        } else {
            console.log(`\n${colors.bold}${colors.red}❌ PLATFORM IS NOT FULLY TESTABLE${colors.reset}`);
            console.log(`${colors.red}Fix critical issues before proceeding with audit.${colors.reset}`);
        }

        // Save results to JSON
        const resultsPath = path.join(process.cwd(), 'TEST_READINESS_RESULTS.json');
        fs.writeFileSync(resultsPath, JSON.stringify(results, null, 2));
        console.log(`\n${colors.cyan}Results saved to: ${resultsPath}${colors.reset}\n`);

        process.exit(results.overall.fail > 0 ? 1 : 0);

    } catch (error) {
        console.error(`\n${colors.red}${colors.bold}FATAL ERROR:${colors.reset} ${error.message}`);
        console.error(error.stack);
        process.exit(1);
    }
}

main();
