import { test, expect } from '@playwright/test';

test('Debug Auth Verification', async ({ page }) => {
    // 1. Setup Request monitoring
    page.on('response', response => {
        if (response.url().includes('/api/auth/login') && response.status() !== 200) {
            console.log(`LOGIN FAILED: ${response.status()} ${response.statusText()}`);
        }
    });

    // 2. Login
    await page.goto('/login');
    await page.fill('input[name="email"]', 'noe@envirojim.com');
    await page.fill('input[name="password"]', '@Enviro2018!');

    // waiting for navigation manually
    await page.click('button[type="submit"]');

    // Wait a moderate amount of time for potential cookie set, even if redirect loops
    await page.waitForTimeout(5000);

    // 3. Access Debug Route (force navigation)
    console.log('Navigating to debug auth route...');
    const response = await page.goto('/api/debug-auth');

    // Extract text content (since it's a browser page now, not APIRequestContext)
    const content = await page.evaluate(() => document.body.innerText);

    // 4. Print Output for Analysis
    console.log('!!! DEBUG AUTH OUTPUT START !!!');
    console.log(content);
    console.log('!!! DEBUG AUTH OUTPUT END !!!');
});
