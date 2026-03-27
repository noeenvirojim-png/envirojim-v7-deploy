import { test, expect } from '@playwright/test';

test.describe('Critical Flows', () => {

    test('Login Page Loads Correctly', async ({ page }) => {
        await page.goto('/login');
        await expect(page).toHaveTitle(/EnviroJim/);
        await expect(page.getByLabel('Email Address')).toBeVisible();
        await expect(page.getByLabel('Password')).toBeVisible();
        await expect(page.getByRole('button', { name: 'Authenticate' })).toBeVisible();
    });

    test('Invalid Login Shows Error', async ({ page }) => {
        await page.goto('/login');
        await page.getByLabel('Email Address').fill('invalid@example.com');
        await page.getByLabel('Password').fill('wrongpassword');
        await page.getByRole('button', { name: 'Authenticate' }).click();

        // Expect error message (generic or specific)
        // The exact text depends on the backend response for non-existent user
        // But we expect SOME alert or error state.
        // Our LoginForm shows an AlertCircle icon on error.
        await expect(page.locator('.bg-destructive\\/15')).toBeVisible({ timeout: 10000 });
    });

    test('Protected Route Redirects to Login', async ({ page }) => {
        await page.goto('/dashboard');
        await expect(page).toHaveURL(/.*\/login/);
    });

});
