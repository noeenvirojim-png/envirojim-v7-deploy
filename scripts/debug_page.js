const { chromium } = require('playwright');

const BASE_URL = 'http://localhost:3000';
const CREDENTIALS = {
    email: 'noe@envirojim.com',
    password: '@Enviro2018!'
};

async function debugPage() {
    const browser = await chromium.launch({ headless: true });
    const context = await browser.newContext();
    const page = await context.newPage();

    console.log('--- Logging in ---');
    await page.goto(`${BASE_URL}/login`);
    await page.fill('input[name="email"]', CREDENTIALS.email);
    await page.fill('input[name="password"]', CREDENTIALS.password);
    await page.click('button[type="submit"]');
    await page.waitForURL(`${BASE_URL}/dashboard`);

    console.log('--- Navigating to /dashboard/tickets ---');
    await page.goto(`${BASE_URL}/dashboard/tickets`);
    await page.waitForLoadState('networkidle');

    const bodyText = await page.innerText('body');
    console.log('--- Body Text (First 5000 chars) ---');
    console.log(bodyText.substring(0, 5000));

    if (bodyText.toLowerCase().includes('failed to fetch') || bodyText.toLowerCase().includes('error')) {
        console.log('--- SPECIFIC ERROR SEARCH ---');
        const lines = bodyText.split('\n');
        lines.forEach(line => {
            if (line.toLowerCase().includes('error') || line.toLowerCase().includes('supabase') || line.toLowerCase().includes('column') || line.toLowerCase().includes('table')) {
                console.log('MATCHING LINE:', line);
            }
        });
    }

    await browser.close();
}

debugPage().catch(console.error);
