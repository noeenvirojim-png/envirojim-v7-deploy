// PHASE 3 - NODE RUNTIME CERTIFICATION
// Verifies HTTP Server, Middleware, and API Routes via Headless Node.js Tests

const http = require('http');
const fs = require('fs');
const path = require('path');

const BASE_URL = 'http://localhost:3001';

const results = {
    timestamp: new Date().toISOString(),
    phase: 'PHASE_3_NODE_RUNTIME',
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

function makeRequest(path, options = {}) {
    return new Promise((resolve, reject) => {
        const req = http.request(`${BASE_URL}${path}`, options, (res) => {
            let data = '';
            res.on('data', (chunk) => data += chunk);
            res.on('end', () => resolve({ statusCode: res.statusCode, headers: res.headers, body: data }));
        });

        req.on('error', (e) => reject(e));
        if (options.body) {
            req.write(options.body);
        }
        req.end();
    });
}

async function runCertification() {
    console.log('═══════════════════════════════════════════════════════════');
    console.log('PHASE 3 - NODE RUNTIME CERTIFICATION');
    console.log('Timestamp:', new Date().toISOString());
    console.log('Target:', BASE_URL);
    console.log('═══════════════════════════════════════════════════════════\n');

    // ============================================================================
    // TEST 1: Server Availability (Health Check)
    // ============================================================================
    console.log('\n📋 TEST GROUP 1: Server Availability\n');

    try {
        const res = await makeRequest('/');
        if (res.statusCode === 200) {
            logTest('Root URL Access', 'PASS', { statusCode: 200, contentType: res.headers['content-type'] });
        } else {
            logTest('Root URL Access', 'FAIL', { statusCode: res.statusCode }, 'Expected 200 OK');
        }
    } catch (error) {
        logTest('Root URL Access', 'FAIL', null, `Connection Refused: ${error.message}`);
        // If server is down, abort
        console.error('🚨 CRITICAL: Server is unreachable. Aborting certification.');
        process.exit(1);
    }

    // ============================================================================
    // TEST 2: Static Asset Serving
    // ============================================================================
    console.log('\n📋 TEST GROUP 2: Static Assets\n');

    try {
        // Attempt to fetch favicon or common Next.js asset
        const res = await makeRequest('/favicon.ico');
        // 200 or 404 is "acceptable" for favicon, but checking if server handles it without crashing
        if (res.statusCode === 200 || res.statusCode === 404) {
            logTest('Static Asset Handling', 'PASS', { statusCode: res.statusCode });
        } else {
            logTest('Static Asset Handling', 'WARNING', { statusCode: res.statusCode }, 'Unexpected status for static asset');
        }
    } catch (error) {
        logTest('Static Asset Handling', 'FAIL', null, error.message);
    }

    // ============================================================================
    // TEST 3: Middleware & Route Protection
    // ============================================================================
    console.log('\n📋 TEST GROUP 3: Middleware & Security\n');

    try {
        // Attempt to access protected dashboard route without auth headers
        const res = await makeRequest('/dashboard');

        // Expecting 307 Temporary Redirect usually (Next.js redirect) or 302, to /login
        if (res.statusCode === 307 || res.statusCode === 302) {
            logTest('Protected Route (No Auth)', 'PASS', {
                statusCode: res.statusCode,
                location: res.headers['location']
            });

            // Verify redirect location
            if (res.headers['location'] && res.headers['location'].includes('/login')) {
                logTest('Redirects to Login', 'PASS', { target: res.headers['location'] });
            } else {
                logTest('Redirects to Login', 'WARNING', { target: res.headers['location'] }, 'Redirect target unclear');
            }

        } else if (res.statusCode === 200) {
            // This would mean dashboard is public!
            logTest('Protected Route (No Auth)', 'FAIL', { statusCode: 200 }, 'Dashboard is accessible without auth!');
        } else {
            logTest('Protected Route (No Auth)', 'WARNING', { statusCode: res.statusCode }, 'Unexpected status');
        }
    } catch (error) {
        logTest('Protected Route (No Auth)', 'FAIL', null, error.message);
    }

    // ============================================================================
    // TEST 4: API Endpoint Behavior
    // ============================================================================
    console.log('\n📋 TEST GROUP 4: API Endpoints (Synthetic)\n');

    // Try a non-existent API route to check 404 handling
    try {
        const res = await makeRequest('/api/this-does-not-exist');
        if (res.statusCode === 404) {
            logTest('API 404 Handling', 'PASS', { statusCode: 404 });
        } else {
            logTest('API 404 Handling', 'WARNING', { statusCode: res.statusCode });
        }
    } catch (error) {
        logTest('API 404 Handling', 'FAIL', null, error.message);
    }

    // ============================================================================
    // FINAL REPORT
    // ============================================================================
    console.log('\n═══════════════════════════════════════════════════════════');
    console.log('PHASE 3 CERTIFICATION - SUMMARY');
    console.log('═══════════════════════════════════════════════════════════');
    console.log(`Total Tests: ${results.summary.total}`);
    console.log(`✅ Passed: ${results.summary.passed}`);
    console.log(`❌ Failed: ${results.summary.failed}`);
    console.log(`⚠️  Warnings: ${results.summary.warnings}`);

    if (results.summary.failed === 0) {
        console.log('\n✅ PHASE 3 STATUS: PASSED');
        results.status = 'PASSED';
    } else {
        console.log('\n❌ PHASE 3 STATUS: FAILED');
        results.status = 'FAILED';
    }

    console.log('═══════════════════════════════════════════════════════════\n');

    // Export JSON results
    const outputPath = path.join(__dirname, '..', 'PHASE3_RUNTIME_RESULTS.json');
    fs.writeFileSync(outputPath, JSON.stringify(results, null, 2));
    console.log(`📁 Results saved to: ${outputPath}`);
}

runCertification();
