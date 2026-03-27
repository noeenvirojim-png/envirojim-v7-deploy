const { chromium } = require('playwright');
const path = require('path');

(async () => {
    console.log('Starting Visual Verification via Node.js...');

    // Launch browser
    const browser = await chromium.launch({ headless: true });
    const context = await browser.newContext();
    const page = await context.newPage();

    page.on('console', msg => console.log('PAGE CONSOLE:', msg.text()));
    page.on('requestfailed', request => console.log('PAGE REQUEST FAILED:', request.url(), request.failure().errorText));

    try {
        // Pre-check connectivity
        try {
            const resp = await fetch('http://127.0.0.1:3001/login');
            console.log('   > Connectivity Check: Status', resp.status);
        } catch (e) {
            console.error('   > Connectivity Check FAILED:', e.message);
        }

        // 1. Visit Login
        console.log('1. Navigating to Login Page (http://127.0.0.1:3001/login)...');
        await page.goto('http://127.0.0.1:3001/login', { timeout: 60000 });

        // Check Fonts on Login
        const bodyFont = await page.$eval('body', (el) => getComputedStyle(el).fontFamily);
        console.log(`   > Detected Body Font: "${bodyFont}"`);
        if (bodyFont.includes('Inter') || bodyFont.includes('system-ui')) {
            console.log('   ✅ Font is correct (Inter/System).');
        } else {
            console.error('   ❌ Font looks wrong (Times New Roman?).');
        }

        // 2. Perform Login
        console.log('2. Attempting Login...');
        await page.fill('input[name="email"]', 'noe@envirojim.com');
        await page.fill('input[name="password"]', '@Enviro2018!');
        await page.click('button[type="submit"]');

        // Wait for Dashboard
        console.log('   > Waiting for redirect...');
        await page.waitForURL('**/dashboard', { timeout: 15000 });
        console.log('   ✅ Redirect successful.');

        // 3. Verify Dashboard Content
        console.log('3. Verifying Dashboard Visuals...');

        // A. Check for "System Healthy" (The new empty state)
        const systemHealthyText = await page.getByText('System Healthy').isVisible();
        if (systemHealthyText) {
            console.log('   ✅ FOUND: "System Healthy" badge (Fake alerts removed).');
        } else {
            console.error('   ❌ MISSING: "System Healthy" badge. Old alerts might still be there.');
        }

        // B. Check CSS Injection (Shadows)
        // We check a card to see if it has the shadow class AND if that class actually does something
        // (detected by checking if computed box-shadow is not 'none')
        const card = page.locator('.shadow-industrial').first();
        const isCardVisible = await card.isVisible();

        if (isCardVisible) {
            console.log('   ✅ FOUND: Element with class ".shadow-industrial".');

            const boxShadow = await card.evaluate((el) => getComputedStyle(el).boxShadow);
            console.log(`   > Computed Box Shadow: "${boxShadow}"`);

            if (boxShadow !== 'none') {
                console.log('   ✅ CSS SUCCESS: Shadow is rendering (Tailwind/PostCSS working).');
            } else {
                console.error('   ❌ CSS FAIL: Box shadow is "none". PostCSS/Tailwind might not be loaded.');
            }
        } else {
            console.warn('   ⚠️ WARNING: No element with .shadow-industrial found to test.');
        }

        console.log('Verification Complete.');

    } catch (error) {
        console.error('CRITICAL ERROR:', error);
        // Take screenshot on error
        await page.screenshot({ path: 'node-error.png' });
    } finally {
        await browser.close();
    }
})();
