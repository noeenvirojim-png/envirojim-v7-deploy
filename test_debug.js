const { chromium } = require('playwright');
const fs = require('fs');

(async () => {
  const browser = await chromium.launch({ headless: false });
  const page = await browser.newPage();

  try {
    // Login
    await page.goto('http://localhost:3004/login', { waitUntil: 'networkidle' });
    await page.fill('input[type="email"]', 'noe@envirojim.com');
    await page.fill('input[type="password"]', 'EnviroJim2024!');
    await page.click('button:has-text("Sign in"), button:has-text("Login"), button[type="submit"]');
    await page.waitForNavigation({ waitUntil: 'networkidle', timeout: 30000 });
    console.log(`LOGIN: ${page.url()}`);

    // Go to Titan
    await page.goto('http://localhost:3004/dashboard/machines/4a0709db-ffd0-49a6-b689-ff476b12c687', { waitUntil: 'networkidle' });
    await page.waitForTimeout(2000);
    console.log(`TITAN: page loaded`);

    // Screenshot
    await page.screenshot({ path: '/tmp/titan_page.png' });
    console.log('SCREENSHOT: saved to /tmp/titan_page.png');

    // Log HTML structure
    const html = await page.content();
    const lines = html.split('\n');
    console.log('\n=== PAGE HTML (first 100 lines) ===');
    lines.slice(0, 100).forEach((line, i) => {
      if (line.includes('Canonical') || line.includes('diagnostic') || line.includes('Search') || line.includes('input')) {
        console.log(`${i}: ${line.substring(0, 120)}`);
      }
    });

    // Check all buttons
    const buttons = await page.locator('button').allTextContents();
    console.log('\n=== BUTTONS FOUND ===');
    buttons.forEach((b, i) => console.log(`${i}: "${b}"`));

    // Check all inputs
    const inputs = await page.locator('input').count();
    console.log(`\n=== INPUTS FOUND: ${inputs} ===`);
    for (let i = 0; i < Math.min(5, inputs); i++) {
      const placeholder = await page.locator('input').nth(i).getAttribute('placeholder');
      const value = await page.locator('input').nth(i).inputValue();
      console.log(`${i}: placeholder="${placeholder}" value="${value}"`);
    }

  } catch (error) {
    console.error('ERROR:', error.message);
  } finally {
    await browser.close();
  }
})();
