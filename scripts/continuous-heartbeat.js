const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const CONFIG = {
    url: 'https://envirojim-final-deployment.vercel.app',
    email: 'noe@envirojim.com',
    password: 'EnviroJim2024!',
    intervalMs: 30000,
    reportPath: path.join(__dirname, '../stability_report.json')
};

async function runHeartbeat() {
    console.log(`[${new Date().toISOString()}] Starting Heartbeat Check...`);
    const browser = await chromium.launch({ headless: false });
    const context = await browser.newContext();
    const page = await context.newPage();

    let status = {
        timestamp: new Date().toISOString(),
        routes: {},
        auth: 'PENDING',
        errors: []
    };

    try {
        // 1. Check Root
        console.log('Checking / ...');
        const rootRes = await page.goto(CONFIG.url);
        status.routes['/'] = rootRes.status();

        // 2. Check /login
        console.log('Checking /login ...');
        const loginRes = await page.goto(`${CONFIG.url}/login`);
        status.routes['/login'] = loginRes.status();

        // 3. Clear state for clean login
        await page.evaluate(() => {
            localStorage.clear();
            sessionStorage.clear();
        });

        // 4. Perform Login
        console.log('Performing Admin Login...');
        await page.fill('input[type="email"]', CONFIG.email);
        await page.fill('input[type="password"]', CONFIG.password);
        await page.click('button[type="submit"]');

        // Wait for redirect
        await page.waitForURL('**/dashboard', { timeout: 10000 }).catch(() => {});
        
        if (page.url().includes('/dashboard')) {
            status.auth = 'SUCCESS';
            status.routes['/dashboard'] = 200;
            console.log('✅ Auth Success');
        } else {
            status.auth = 'FAILED';
            status.errors.push(`Auth redirect failed. Current URL: ${page.url()}`);
            console.log('❌ Auth Failed');
        }

        // 5. Check /debug
        console.log('Checking /debug ...');
        const debugRes = await page.goto(`${CONFIG.url}/debug`).catch(() => null);
        status.routes['/debug'] = debugRes ? debugRes.status() : 'TIMEOUT';

        // 6. Check /v72-test
        console.log('Checking /v72-test ...');
        const v72Res = await page.goto(`${CONFIG.url}/v72-test`).catch(() => null);
        status.routes['/v72-test'] = v72Res ? v72Res.status() : 'TIMEOUT';

    } catch (err) {
        console.error('Fatal Heartbeat Error:', err);
        status.errors.push(err.message);
    } finally {
        await browser.close();
        fs.writeFileSync(CONFIG.reportPath, JSON.stringify(status, null, 2));
        console.log(`[${new Date().toISOString()}] Heartbeat Complete. Report saved.`);
    }
}

// Simple loop if running directly
if (require.main === module) {
    runHeartbeat();
    setInterval(runHeartbeat, CONFIG.intervalMs);
}

module.exports = { runHeartbeat };
