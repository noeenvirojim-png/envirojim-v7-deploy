const { execSync, spawn } = require('child_process');
const http = require('http');

/**
 * CI HARD GATE PIPELINE (STABLE VERSION V4)
 */

function killPort(port) {
    try {
        const output = execSync(`netstat -ano | findstr :${port}`).toString();
        const lines = output.split('\n');
        for (const line of lines) {
            if (line.includes('LISTENING')) {
                const parts = line.trim().split(/\s+/);
                const pid = parts[parts.length - 1];
                if (pid && pid !== '0') {
                    console.log(`Killing PID ${pid} on port ${port}`);
                    // Wrap in try catch to ignore "already gone" errors
                    try { execSync(`taskkill /F /PID ${pid} /T`); } catch (err) { }
                }
            }
        }
    } catch (e) { }
}

async function run() {
    console.log('🚀 INITIALIZING CI HARD GATE PIPELINE (V4)...');

    try {
        // 0. Clean port 3000
        console.log('--- STEP 0: Cleaning port 3000 ---');
        killPort(3000);

        // 1. Build
        console.log('\n--- STEP 1: Build ---');
        execSync('npm run build', { stdio: 'inherit' });

        // 2. Schema Drift Gate
        console.log('\n--- STEP 2: Schema Drift Zero-Tolerance Gate ---');
        execSync('npm run validate:schema:gate', { stdio: 'inherit' });

        // 3. Architecture Lockdown (Scans for forbidden calls)
        console.log('\n--- STEP 3: Architecture Lockdown Scan ---');
        execSync('npm run lockdown:arch', { stdio: 'inherit' });

        // 4. Performance & Scalability Baseline
        console.log('\n--- STEP 4: Performance & Scalability Baseline ---');
        execSync('npm run load:test', { stdio: 'inherit' });

        // 5. Start Prod Server
        console.log('\n--- STEP 5: Starting Production Server ---');
        const server = spawn('npm', ['run', 'start'], {
            stdio: 'inherit',
            detached: false,
            env: { ...process.env, NODE_TLS_REJECT_UNAUTHORIZED: '0' },
            shell: true
        });

        // Wait for port 3000
        console.log('Waiting for localhost:3000...');
        let ready = false;
        for (let i = 0; i < 30; i++) {
            try {
                const check = execSync('netstat -ano | findstr :3000 | findstr LISTENING').toString();
                if (check) {
                    ready = true;
                    break;
                }
            } catch (e) { }
            await new Promise(r => setTimeout(r, 2000));
        }

        if (!ready) {
            console.error('Server failed to start on 3000');
            process.exit(1);
        }
        console.log('✅ Server is UP.');
        await new Promise(r => setTimeout(r, 5000));

        // 6. E2E Production Hardened Tests
        const tests = [
            { name: 'Auth Production Hardening', cmd: 'npx playwright test tests/e2e/10-auth-prod.spec.ts --project=chromium' },
            { name: 'File Upload & Storage', cmd: 'npx playwright test tests/e2e/20-file-upload.spec.ts --project=chromium' },
            { name: 'Mapper Chaos Invariants', cmd: 'npx playwright test tests/chaos/01-invalid-payload.spec.ts --project=chromium' },
            { name: 'Architecture Constraint Check', cmd: 'npx playwright test tests/e2e/arch-contract.spec.ts --project=chromium' }
        ];

        for (const test of tests) {
            console.log(`\n--- RUNNING: ${test.name} ---`);
            execSync(test.cmd, { stdio: 'inherit' });
            console.log(`✅ ${test.name} PASSED.`);
        }

        console.log('\n✨ ALL PRODUCTION HARDENING GATES PASSED. SYSTEM CERTIFIED.');
        process.exit(0);

    } catch (err) {
        console.error('\n❌ PIPELINE FAILED.');
        process.exit(1);
    }
}

run();
