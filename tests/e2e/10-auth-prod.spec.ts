import { test, expect } from '@playwright/test';

/**
 * PRODUCTION AUTH HARDENING TESTS
 * 
 * Validates:
 * 1. Admin login success
 * 2. Technician login success
 * 3. Session persistence/refresh
 * 4. Unauthorized access blocking (Dashboard)
 * 5. Logout logic
 */

const ADMIN_EMAIL = 'parts@envirojim.com';
const TECH_EMAIL = 'tech@northernsp.com';
const TEST_PASSWORD = 'EnviroJim2024!';

test.describe('Production Auth Hardening', () => {

    test('Unauthorized user is redirected from /dashboard to /login', async ({ page }) => {
        await page.goto('/dashboard');
        await expect(page).toHaveURL(/\/login/);
        const redirectedFrom = new URL(page.url()).searchParams.get('redirectedFrom');
        expect(redirectedFrom).toBe('/dashboard');
    });

    test('Admin user can login and see dashboard', async ({ page }) => {
        await page.goto('/login');
        await page.fill('input[name="email"]', ADMIN_EMAIL);
        await page.fill('input[name="password"]', TEST_PASSWORD);
        await page.click('button[type="submit"]');

        await expect(page).toHaveURL(/\/dashboard/);
        // Expect to see some admin-only or general dashboard indicator
        await expect(page.getByText(/Dashboard/i)).toBeVisible();
    });

    test('Technician user can login and see dashboard', async ({ page }) => {
        await page.goto('/login');
        await page.fill('input[name="email"]', TECH_EMAIL);
        await page.fill('input[name="password"]', TEST_PASSWORD);
        await page.click('button[type="submit"]');

        await expect(page).toHaveURL(/\/dashboard/);
        await expect(page.getByText(/Dashboard/i)).toBeVisible();
    });

    test('Session persist after reload', async ({ page }) => {
        // Login first
        await page.goto('/login');
        await page.fill('input[name="email"]', TECH_EMAIL);
        await page.fill('input[name="password"]', TEST_PASSWORD);
        await page.click('button[type="submit"]');
        await expect(page).toHaveURL(/\/dashboard/);

        // Reload page
        await page.reload();
        await expect(page).toHaveURL(/\/dashboard/);
        await expect(page.getByText(/Dashboard/i)).toBeVisible();
    });

    test('Logout clears session and redirects to /login', async ({ page }) => {
        // Login
        await page.goto('/login');
        await page.fill('input[name="email"]', ADMIN_EMAIL);
        await page.fill('input[name="password"]', TEST_PASSWORD);
        await page.click('button[type="submit"]');
        await expect(page).toHaveURL(/\/dashboard/);

        // Find and click logout (assuming it's in a dropdown or sidebar)
        // Adjust selector based on actual UI if known, otherwise look for "Logout" text
        const logoutBtn = page.getByRole('button', { name: /Logout|Se déconnecter/i });

        // If it's in a dropdown, we might need to click the user menu first
        const userMenu = page.locator('button[aria-haspopup="menu"]');
        if (await userMenu.isVisible()) {
            await userMenu.click();
        }

        await logoutBtn.click();
        await expect(page).toHaveURL(/\/login/);

        // Try to go back to dashboard - should be blocked
        await page.goto('/dashboard');
        await expect(page).toHaveURL(/\/login/);
    });
});
