
import { test, expect } from '@playwright/test';
import { TEST_CREDENTIALS } from './fixtures';

test('Debug Machine Route', async ({ page }) => {
    // Login as Super Admin
    await page.goto('/login');
    await page.fill('input[name="email"]', TEST_CREDENTIALS.super.email);
    await page.fill('input[name="password"]', TEST_CREDENTIALS.super.password);
    await page.click('button[type="submit"]');
    await page.waitForURL('**/dashboard');

    console.log('Logged in. Navigating to /dashboard/machines/create directly...');
    const response = await page.goto('/dashboard/machines/create');
    console.log(`Response status: ${response?.status()}`);

    if (response?.status() === 404) {
        console.log('404 Error! Taking screenshot...');
        await page.screenshot({ path: 'test-results/debug-machine-404.png' });
        const content = await page.content();
        console.log('Page content:', content.substring(0, 500));
    } else {
        console.log('Success! Page loaded.');
        await page.screenshot({ path: 'test-results/debug-machine-success.png' });
    }
});
