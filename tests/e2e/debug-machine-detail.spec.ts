
import { test, expect } from '@playwright/test';
import { TEST_CREDENTIALS } from './fixtures';

test('Debug Machine Detail Route', async ({ page }) => {
    // Login as Super Admin
    await page.goto('/login');
    await page.fill('input[name="email"]', TEST_CREDENTIALS.super.email);
    await page.fill('input[name="password"]', TEST_CREDENTIALS.super.password);
    await page.click('button[type="submit"]');
    await page.waitForURL('**/dashboard');

    console.log('Logged in. Finding a machine...');
    await page.goto('/dashboard/machines');

    // Click the first machine card or link
    const machineLink = page.locator('a[href*="/dashboard/machines/"]').first();
    const count = await machineLink.count();

    if (count > 0) {
        const href = await machineLink.getAttribute('href');
        console.log(`Found machine link: ${href}`);
        await machineLink.click();
        await page.waitForTimeout(2000); // Wait for load

        console.log(`Current URL: ${page.url()}`);
        const title = await page.title();
        console.log(`Page Title: ${title}`);

        // Check for 404 textual indicator just in case
        const notFound = await page.getByText('404').count();
        if (notFound > 0) {
            console.error('Page contains 404 text');
        } else {
            console.log('Page loaded successfully (no 404 text found)');
        }

        await page.screenshot({ path: 'test-results/debug-machine-detail.png' });
    } else {
        console.log('No machines found in list to click.');
    }
});
