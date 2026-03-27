import { test, expect } from '@playwright/test';
import path from 'path';
import fs from 'fs';

/**
 * DEBUG LOGIN TEST — captures every console error, network response, 
 * and the exact error message visible after a failed login attempt.
 */

const TARGET_URL = 'https://envirojim-final-deployment.vercel.app';
const SCREENSHOT_DIR = path.resolve('../tests/screenshots/debug');
if (!fs.existsSync(SCREENSHOT_DIR)) fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });

test('DEBUG: Capture exact login failure state', async ({ page, context }) => {
    const consoleErrors: string[] = [];
    const networkRequests: any[] = [];

    // Capture all console messages
    page.on('console', msg => {
        if (msg.type() === 'error') consoleErrors.push(msg.text());
    });

    // Capture all network requests
    page.on('response', response => {
        networkRequests.push({
            url: response.url().slice(0, 100),
            status: response.status(),
        });
    });

    // 1. Load login page
    await page.goto(`${TARGET_URL}/login`);
    await page.waitForLoadState('networkidle');
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, '1_login_page.png') });
    console.log('📸 Login page loaded');

    // 2. Fill credentials
    await page.fill('input[id="email"]', 'noe@envirojim.com');
    await page.fill('input[id="password"]', '@Enviro2018!');
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, '2_credentials_filled.png') });

    // 3. Click submit + wait for any response
    await page.click('button[type="submit"]');
    
    // Wait up to 15 seconds for EITHER dashboard redirect or error to appear
    await Promise.race([
        page.waitForURL(/.*\/dashboard/, { timeout: 15000 }).catch(() => null),
        page.waitForTimeout(15000)
    ]);

    const finalUrl = page.url();
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, '3_after_login.png') });

    // 4. Capture all visible text on the page (error messages etc.)
    const pageText = await page.locator('body').textContent();
    const errorVisibleOnPage = pageText?.match(/(courriel|password|invalid|error|erreur|connexion|failed)/gi);

    // 5. Check for toast messages
    const toasts = await page.locator('[role="alert"], [data-sonner-toast], .sonner').allTextContents().catch(() => []);

    // 6. Report
    console.log('\n========== DEBUG REPORT ==========');
    console.log('Final URL:', finalUrl);
    console.log('Login SUCCESS:', finalUrl.includes('/dashboard'));
    console.log('Visible error keywords:', errorVisibleOnPage);
    console.log('Toast messages:', toasts);
    console.log('\nConsole errors:', consoleErrors.length > 0 ? consoleErrors : 'None');
    
    const authRequests = networkRequests.filter(r => 
        r.url.includes('/api/auth/login') || r.url.includes('/auth/v1/token')
    );
    console.log('\nAuth network requests:');
    authRequests.forEach(r => console.log(`  ${r.status} ${r.url}`));
    
    console.log('\nAll captured requests (last 10):');
    networkRequests.slice(-10).forEach(r => console.log(`  ${r.status} ${r.url}`));

    // Make the test "pass" regardless so we always get screenshots
    // The truth is in the console output above
    console.log('=====================================');
});
