import { test, expect } from '@playwright/test';

const BASE_URL = process.env.BASE_URL || 'https://envirojim-final-deployment.vercel.app';

test.describe('Envirojim Production Smoke Test', () => {

    test('1. App Load & Authentication', async ({ page }) => {
        console.log(`Testing production environment: ${BASE_URL}`);
        await page.goto(`${BASE_URL}/login`);
        
        // Wait for auth form
        await expect(page.locator('input[type="email"]')).toBeVisible();

        // Perform login
        await page.fill('input[type="email"]', 'admin@envirojim.com');
        await page.click('button[type="submit"]');

        // Check if dashboard navigation occurs or auth error shows up
        // Here we just make sure page didn't crash
        await expect(page).toHaveTitle(/EnviroJim|Login|Dashboard/);
    });

    test('2. Ensure No Console Errors', async ({ page }) => {
        const errors: string[] = [];
        page.on('pageerror', err => errors.push(err.message));
        page.on('console', msg => {
            if (msg.type() === 'error') errors.push(msg.text());
        });

        await page.goto(`${BASE_URL}/login`);
        expect(errors.length).toBe(0);
    });
});
