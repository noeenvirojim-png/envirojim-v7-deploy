import { test, expect } from '@playwright/test';

/**
 * ENVIROJIM AI EXCELLENCE CERTIFICATION SUITE
 * World-Class SaaS Standard Audit
 */

const TARGET_URL = 'https://envirojim-final-deployment.vercel.app';
const AUTH_EMAIL = 'auditor-v6@envirojim.com';
const AUTH_PASS = 'EnviroJim2024!';

test.describe('Phase 1: Authentication Resilience', () => {
    test('Standard Login & Session Persistence', async ({ page, context }) => {
        await page.goto(`${TARGET_URL}/login`);
        
        // Login Flow
        await page.fill('input[type="email"]', AUTH_EMAIL);
        await page.fill('input[type="password"]', AUTH_PASS);
        await page.click('button:has-text("Authenticate")');
        
        await expect(page).toHaveURL(`${TARGET_URL}/dashboard`);
        await expect(page.locator('text=Administrator')).toBeVisible();

        // Persistence: Refresh
        await page.reload();
        await expect(page.locator('text=Administrator')).toBeVisible();

        // Persistence: New Tab (in same context)
        const newPage = await context.newPage();
        await newPage.goto(`${TARGET_URL}/dashboard`);
        await expect(newPage.locator('text=Administrator')).toBeVisible();
    });

    test('Rapid Route Navigation Stability', async ({ page }) => {
        await page.goto(`${TARGET_URL}/login`);
        await page.fill('input[type="email"]', AUTH_EMAIL);
        await page.fill('input[type="password"]', AUTH_PASS);
        await page.click('button:has-text("Authenticate")');

        const routes = ['/dashboard', '/dashboard/machines', '/dashboard/diagnosis', '/dashboard/settings'];
        
        for (let i = 0; i < 5; i++) {
            for (const route of routes) {
                await page.goto(`${TARGET_URL}${route}`);
                await expect(page.locator('aside')).toBeVisible();
            }
        }
    });
});

test.describe('Phase 2 & 3: Dashboard & Machine Resolution', () => {
    test.beforeEach(async ({ page }) => {
        await page.goto(`${TARGET_URL}/login`);
        await page.fill('input[type="email"]', AUTH_EMAIL);
        await page.fill('input[type="password"]', AUTH_PASS);
        await page.click('button:has-text("Authenticate")');
    });

    test('Machine Lookup Resolution (VB750 Variants)', async ({ page }) => {
        const variants = ['VB750-1773016309210', 'vb750-1773016309210'];
        
        for (const sn of variants) {
            await page.goto(`${TARGET_URL}/dashboard/machines`);
            await page.fill('input[placeholder*="recherche"]', sn);
            await page.keyboard.press('Enter');
            
            // Should find the machine in the list
            const machineLink = page.locator(`text=${sn}`).first();
            await expect(machineLink).toBeVisible();
            
            // Navigate to detail
            await machineLink.click();
            await expect(page).toHaveURL(/\/dashboard\/machines\/[0-9a-f-]+/);
            await expect(page.locator('h1')).toContainText(sn);
        }
    });
});

test.describe('Phase 4, 5 & 6: AI Diagnostic Pipeline & Quality', () => {
    test.beforeEach(async ({ page }) => {
        await page.goto(`${TARGET_URL}/login`);
        await page.fill('input[type="email"]', AUTH_EMAIL);
        await page.fill('input[type="password"]', AUTH_PASS);
        await page.click('button:has-text("Authenticate")');
    });

    test('Full AI Diagnostic Flow & Quality Assessment', async ({ page }) => {
        // Targeted Test Machine
        const machineSN = 'VB750-1773016309210';
        await page.goto(`${TARGET_URL}/dashboard/machines`);
        await page.locator(`text=${machineSN}`).first().click();
        
        // Start Diagnostic
        await page.click('button:has-text("Actions")');
        await page.click('text=Lancer le Diagnostic');
        
        // Input symptom
        const symptom = "Surchauffe moteur et perte de pression hydraulique après 2h d'utilisation.";
        await page.fill('textarea', symptom);
        
        const startTime = Date.now();
        await page.click('button:has-text("Soumettre")');
        
        // Wait for AI - SaaS Standard < 5s
        await expect(page.locator('text=Analyse en cours').first()).toBeVisible();
        await expect(page.locator('text=Probabilité de la cause').first()).toBeVisible({ timeout: 15000 });
        
        const duration = (Date.now() - startTime) / 1000;
        console.log(`[Performance] AI Diagnostic latency: ${duration}s`);
        
        // Benchmark Content
        const results = await page.locator('.bg-slate-50').textContent();
        expect(results).toContain('Cause');
        expect(results).toContain('Étapes de réparation');
    });
});

test.describe('Phase 8: Platform Stress & Parallel Load', () => {
    test('Parallel Action Processing', async ({ page, context }) => {
        await page.goto(`${TARGET_URL}/login`);
        await page.fill('input[type="email"]', AUTH_EMAIL);
        await page.fill('input[type="password"]', AUTH_PASS);
        await page.click('button:has-text("Authenticate")');

        // Spin up multiple pages mimicking heavy use
        const pages = await Promise.all([
            context.newPage(),
            context.newPage(),
            context.newPage()
        ]);

        await Promise.all(pages.map(p => p.goto(`${TARGET_URL}/dashboard/machines`)));
        await Promise.all(pages.map(p => p.reload()));
        
        for (const p of pages) {
            await expect(p.locator('text=Administrator')).toBeVisible();
            await p.close();
        }
    });
});
