import { test, expect, devices } from '@playwright/test';

const TARGET_URL = 'https://envirojim-final-deployment.vercel.app';
const ADMIN_EMAIL = 'noe@envirojim.com';
const ADMIN_PASSWORD = 'EnviroJim2024!';

const viewports = [
    { name: 'Mobile', ...devices['iPhone 12'] },
    { name: 'Tablet', ...devices['iPad Pro 11'] },
    { name: 'Desktop', viewport: { width: 1440, height: 900 } }
];

for (const vp of viewports) {
    test.describe(`UI Stability Audit - ${vp.name}`, () => {
        test.use({ ...vp });

        test('Login and Dashboard Stability', async ({ page }) => {
            console.log(`Auditing ${vp.name} viewport...`);
            
            // 1. Visit Login
            await page.goto(`${TARGET_URL}/login`);
            await expect(page).toHaveTitle(/EnviroJim/i);

            // 2. Perform Login
            await page.fill('input[type="email"]', ADMIN_EMAIL);
            await page.fill('input[type="password"]', ADMIN_PASSWORD);
            await Promise.all([
                page.waitForURL('**/dashboard'),
                page.click('button[type="submit"]')
            ]);

            // 3. Verify Dashboard Layout
            await expect(page.locator('nav')).toBeVisible();
            
            // Check for common layout issues
            const bodyHeight = await page.evaluate(() => document.body.scrollHeight);
            expect(bodyHeight).toBeGreaterThan(0);

            // 4. Navigate to Machines
            await page.goto(`${TARGET_URL}/dashboard/machines`);
            await expect(page.locator('h1')).toContainText(/Inventory|Machines/i);

            // 5. Look for Hydration Errors 
            const logs = [];
            page.on('console', msg => {
                if (msg.type() === 'error' && msg.text().includes('hydration')) {
                    logs.push(msg.text());
                }
            });

            // Trigger a re-render or slight interaction to check hydration
            await page.click('body');
            
            if (logs.length > 0) {
                console.warn(`[HYDRATION] Detected on ${vp.name}:`, logs);
            }

            // 6. Screenshot for report
            await page.screenshot({ path: `tests/audit-results/ui-${vp.name.toLowerCase()}.png` });
        });
    });
}
