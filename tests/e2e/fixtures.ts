import { test, expect, Page } from '@playwright/test';

/**
 * Test Fixtures and Utilities
 */

// Test credentials (should match your seed data)
export const TEST_CREDENTIALS = {
    super: {
        email: 'noe@envirojim.com',
        password: '@Enviro2018!',
        role: 'SUPER_ADMIN'
    },
    admin: {
        email: 'noe@envirojim.com',
        password: '@Enviro2018!',
        role: 'SUPER_ADMIN'
    },
    support: {
        email: 'parts@envirojim.com',
        password: 'EnviroJim2024!',
        role: 'SUPPORT_ADMIN'
    },
    manager: {
        email: 'manager@acmemining.com',
        password: 'EnviroJim2024!',
        role: 'ORG_ADMIN'
    },
    tech: {
        email: 'tech@northernsp.com',
        password: 'EnviroJim2024!',
        role: 'TECHNICIAN'
    },
    operator: {
        email: 'operator@acmemining.com',
        password: 'EnviroJim2024!',
        role: 'OPERATOR'
    }
};

// Helper to collect console messages
export class ConsoleCollector {
    messages: Array<{ type: string; text: string }> = [];
    errors: Array<string> = [];

    attach(page: Page) {
        page.on('console', msg => {
            const type = msg.type();
            const text = msg.text();
            this.messages.push({ type, text });

            if (type === 'error') {
                this.errors.push(text);
            }
        });

        page.on('pageerror', error => {
            this.errors.push(`Uncaught exception: ${error.message}`);
        });
    }

    getErrors(): string[] {
        return this.errors;
    }

    getSummary(): string {
        return `Total messages: ${this.messages.length}, Errors: ${this.errors.length}`;
    }
}

// Helper to collect network failures
export class NetworkCollector {
    failures: Array<{ url: string; status: number; statusText: string }> = [];

    attach(page: Page) {
        page.on('response', response => {
            if (response.status() >= 400) {
                this.failures.push({
                    url: response.url(),
                    status: response.status(),
                    statusText: response.statusText()
                });
            }
        });
    }

    getFailures() {
        return this.failures;
    }

    hasFailed(): boolean {
        return this.failures.length > 0;
    }
}

// Helper to measure performance
export class PerformanceCollector {
    metrics: any = {};

    async collect(page: Page) {
        const performanceTiming = await page.evaluate(() => {
            const timing = performance.timing;
            return {
                domContentLoaded: timing.domContentLoadedEventEnd - timing.navigationStart,
                loadComplete: timing.loadEventEnd - timing.navigationStart,
                ttfb: timing.responseStart - timing.navigationStart,
            };
        });

        this.metrics = performanceTiming;
        return performanceTiming;
    }

    getSummary(): string {
        return `TTFB: ${this.metrics.ttfb}ms, DOMContentLoaded: ${this.metrics.domContentLoaded}ms, Load: ${this.metrics.loadComplete}ms`;
    }
}

// Login helper
export async function login(page: Page, credentials: { email: string; password: string }) {
    await page.goto('/login');

    // Wait for login form
    await page.waitForSelector('input[type="email"]', { timeout: 10000 });

    // Fill credentials
    await page.fill('input[type="email"]', credentials.email);
    await page.fill('input[type="password"]', credentials.password);

    // Submit
    await page.click('button[type="submit"]');

    // Wait for navigation to dashboard
    await page.waitForURL('**/dashboard**', { timeout: 30000 });
}
