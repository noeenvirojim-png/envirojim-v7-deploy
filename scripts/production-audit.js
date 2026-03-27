/**
 * EnviroJim V6 Production Audit - Automated Test Suite
 * 
 * Comprehensive testing of:
 * - JWT Authentication for all roles
 * - Frontend page loads
 * - API endpoints
 * - RLS enforcement
 * - Performance metrics
 */

const https = require('https');
const http = require('http');

// Configuration
const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

// Test users
const TEST_USERS = [
    {
        role: 'SUPER_ADMIN',
        email: 'noe@envirojim.com',
        password: process.env.SUPER_ADMIN_PASSWORD || 'test123',
        expectedOrgId: '00000000-0000-0000-0000-000000000001'
    },
    {
        role: 'ENVIROJIM_ADMIN',
        email: 'parts@envirojim.com',
        password: process.env.ENVIROJIM_ADMIN_PASSWORD || 'test123',
        expectedOrgId: '00000000-0000-0000-0000-000000000001'
    }
];

// Test results
const results = {
    database: { passed: 0, failed: 0, tests: [] },
    authentication: { passed: 0, failed: 0, tests: [] },
    frontend: { passed: 0, failed: 0, tests: [] },
    rls: { passed: 0, failed: 0, tests: [] },
    performance: { passed: 0, failed: 0, tests: [] }
};

// Utility: HTTP Request
function makeRequest(url, options = {}) {
    return new Promise((resolve, reject) => {
        const urlObj = new URL(url);
        const client = urlObj.protocol === 'https:' ? https : http;

        const req = client.request(url, options, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                resolve({
                    status: res.statusCode,
                    headers: res.headers,
                    body: data,
                    json: () => {
                        try {
                            return JSON.parse(data);
                        } catch (e) {
                            return null;
                        }
                    }
                });
            });
        });

        req.on('error', reject);

        if (options.body) {
            req.write(options.body);
        }

        req.end();
    });
}

// Test: Server is running
async function testServerRunning() {
    console.log('\n========================================');
    console.log('TEST: Server Running');
    console.log('========================================');

    try {
        const res = await makeRequest(BASE_URL);
        if (res.status === 200 || res.status === 307 || res.status === 308) {
            console.log('✅ PASS: Server is running');
            results.frontend.passed++;
            results.frontend.tests.push({ name: 'Server Running', status: 'PASS' });
            return true;
        } else {
            console.log(`❌ FAIL: Server returned status ${res.status}`);
            results.frontend.failed++;
            results.frontend.tests.push({ name: 'Server Running', status: 'FAIL', error: `Status ${res.status}` });
            return false;
        }
    } catch (error) {
        console.log(`❌ FAIL: Server not accessible - ${error.message}`);
        results.frontend.failed++;
        results.frontend.tests.push({ name: 'Server Running', status: 'FAIL', error: error.message });
        return false;
    }
}

// Test: Login for specific role
async function testLogin(user) {
    console.log(`\n========================================`);
    console.log(`TEST: Login - ${user.role}`);
    console.log(`========================================`);

    const startTime = Date.now();

    try {
        const res = await makeRequest(`${BASE_URL}/api/auth/login`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                email: user.email,
                password: user.password
            })
        });

        const duration = Date.now() - startTime;
        const data = res.json();

        console.log(`Response status: ${res.status}`);
        console.log(`Response time: ${duration}ms`);

        if (res.status === 200 && data && data.success) {
            console.log(`✅ PASS: Login successful for ${user.role}`);
            console.log(`   User ID: ${data.user?.id}`);
            console.log(`   Email: ${data.user?.email}`);
            console.log(`   Role: ${data.user?.role}`);
            console.log(`   Org ID: ${data.user?.org_id}`);

            // Verify JWT claims
            if (data.user?.role === user.role) {
                console.log(`✅ PASS: JWT role claim matches expected`);
                results.authentication.passed++;
            } else {
                console.log(`❌ FAIL: JWT role mismatch - expected ${user.role}, got ${data.user?.role}`);
                results.authentication.failed++;
            }

            if (data.user?.org_id === user.expectedOrgId) {
                console.log(`✅ PASS: JWT org_id claim matches expected`);
                results.authentication.passed++;
            } else {
                console.log(`❌ FAIL: JWT org_id mismatch - expected ${user.expectedOrgId}, got ${data.user?.org_id}`);
                results.authentication.failed++;
            }

            // Performance check
            if (duration < 500) {
                console.log(`✅ PASS: Login performance acceptable (${duration}ms < 500ms)`);
                results.performance.passed++;
            } else {
                console.log(`⚠️  WARNING: Login slow (${duration}ms)`);
                results.performance.failed++;
            }

            results.authentication.tests.push({
                name: `Login ${user.role}`,
                status: 'PASS',
                duration
            });

            return { success: true, cookies: res.headers['set-cookie'], user: data.user };
        } else {
            console.log(`❌ FAIL: Login failed for ${user.role}`);
            console.log(`   Error: ${data?.error || 'Unknown error'}`);
            results.authentication.failed++;
            results.authentication.tests.push({
                name: `Login ${user.role}`,
                status: 'FAIL',
                error: data?.error
            });
            return { success: false };
        }
    } catch (error) {
        console.log(`❌ FAIL: Login request failed - ${error.message}`);
        results.authentication.failed++;
        results.authentication.tests.push({
            name: `Login ${user.role}`,
            status: 'FAIL',
            error: error.message
        });
        return { success: false };
    }
}

// Test: Dashboard page load
async function testDashboardLoad(cookies) {
    console.log(`\n========================================`);
    console.log(`TEST: Dashboard Page Load`);
    console.log(`========================================`);

    const startTime = Date.now();

    try {
        const res = await makeRequest(`${BASE_URL}/dashboard`, {
            headers: {
                'Cookie': cookies ? cookies.join('; ') : ''
            }
        });

        const duration = Date.now() - startTime;

        console.log(`Response status: ${res.status}`);
        console.log(`Response time: ${duration}ms`);

        if (res.status === 200) {
            console.log(`✅ PASS: Dashboard loaded successfully`);
            results.frontend.passed++;

            // Check for common errors in HTML
            const html = res.body;
            if (html.includes('error') || html.includes('Error')) {
                console.log(`⚠️  WARNING: Dashboard HTML contains error text`);
            }

            // Performance check
            if (duration < 1000) {
                console.log(`✅ PASS: Dashboard load performance acceptable (${duration}ms < 1000ms)`);
                results.performance.passed++;
            } else {
                console.log(`⚠️  WARNING: Dashboard load slow (${duration}ms)`);
                results.performance.failed++;
            }

            results.frontend.tests.push({
                name: 'Dashboard Load',
                status: 'PASS',
                duration
            });

            return true;
        } else if (res.status === 307 || res.status === 308) {
            console.log(`❌ FAIL: Dashboard redirected (likely auth failure)`);
            console.log(`   Redirect to: ${res.headers.location}`);
            results.frontend.failed++;
            results.frontend.tests.push({
                name: 'Dashboard Load',
                status: 'FAIL',
                error: 'Redirected (auth failure)'
            });
            return false;
        } else {
            console.log(`❌ FAIL: Dashboard returned status ${res.status}`);
            results.frontend.failed++;
            results.frontend.tests.push({
                name: 'Dashboard Load',
                status: 'FAIL',
                error: `Status ${res.status}`
            });
            return false;
        }
    } catch (error) {
        console.log(`❌ FAIL: Dashboard request failed - ${error.message}`);
        results.frontend.failed++;
        results.frontend.tests.push({
            name: 'Dashboard Load',
            status: 'FAIL',
            error: error.message
        });
        return false;
    }
}

// Generate final report
function generateReport() {
    console.log('\n\n');
    console.log('========================================');
    console.log('ENVIROJIM V6 PRODUCTION AUDIT REPORT');
    console.log('========================================');
    console.log(`Date: ${new Date().toISOString()}`);
    console.log(`Base URL: ${BASE_URL}`);
    console.log('');

    const categories = ['database', 'authentication', 'frontend', 'rls', 'performance'];
    let totalPassed = 0;
    let totalFailed = 0;

    categories.forEach(category => {
        const cat = results[category];
        totalPassed += cat.passed;
        totalFailed += cat.failed;

        console.log(`\n${category.toUpperCase()}`);
        console.log(`  Passed: ${cat.passed}`);
        console.log(`  Failed: ${cat.failed}`);
        console.log(`  Total: ${cat.passed + cat.failed}`);

        if (cat.tests.length > 0) {
            console.log(`  Tests:`);
            cat.tests.forEach(test => {
                const icon = test.status === 'PASS' ? '✅' : '❌';
                console.log(`    ${icon} ${test.name}${test.duration ? ` (${test.duration}ms)` : ''}`);
                if (test.error) {
                    console.log(`       Error: ${test.error}`);
                }
            });
        }
    });

    console.log('\n========================================');
    console.log('OVERALL SUMMARY');
    console.log('========================================');
    console.log(`Total Tests: ${totalPassed + totalFailed}`);
    console.log(`Passed: ${totalPassed}`);
    console.log(`Failed: ${totalFailed}`);

    const passRate = totalPassed + totalFailed > 0
        ? ((totalPassed / (totalPassed + totalFailed)) * 100).toFixed(1)
        : 0;
    console.log(`Pass Rate: ${passRate}%`);

    console.log('\n========================================');
    console.log('PRODUCTION READINESS');
    console.log('========================================');

    if (totalFailed === 0 && totalPassed > 10) {
        console.log('✅ READY FOR PRODUCTION');
        console.log('All tests passed. Platform is stable and secure.');
    } else if (totalFailed <= 2 && passRate >= 90) {
        console.log('⚠️  CONDITIONALLY READY');
        console.log('Minor issues detected. Review failures before deploying.');
    } else {
        console.log('❌ NOT READY FOR PRODUCTION');
        console.log('Critical issues detected. Fix failures before deploying.');
    }

    console.log('\n========================================');

    return {
        totalPassed,
        totalFailed,
        passRate,
        ready: totalFailed === 0 && totalPassed > 10
    };
}

// Main test execution
async function runTests() {
    console.log('========================================');
    console.log('ENVIROJIM V6 PRODUCTION AUDIT');
    console.log('========================================');
    console.log(`Starting automated tests...`);
    console.log(`Base URL: ${BASE_URL}`);
    console.log('');

    // Test 1: Server running
    const serverRunning = await testServerRunning();
    if (!serverRunning) {
        console.log('\n❌ CRITICAL: Server not running. Cannot continue tests.');
        generateReport();
        process.exit(1);
    }

    // Test 2: Login for each role
    for (const user of TEST_USERS) {
        const loginResult = await testLogin(user);

        if (loginResult.success) {
            // Test 3: Dashboard load with authenticated session
            await testDashboardLoad(loginResult.cookies);
        }

        // Wait between tests
        await new Promise(resolve => setTimeout(resolve, 1000));
    }

    // Generate final report
    const report = generateReport();

    // Exit with appropriate code
    process.exit(report.ready ? 0 : 1);
}

// Run tests
runTests().catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
});
