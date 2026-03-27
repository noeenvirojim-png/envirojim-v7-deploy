const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  console.log('=== FINDING AUTH ROUTE ===\n');

  try {
    console.log('[1] Navigating to http://localhost:3004/dashboard...');
    const response = await page.goto('http://localhost:3004/dashboard', {
      waitUntil: 'load',
      timeout: 15000
    });

    console.log(`[2] Navigation status: ${response?.status()}`);
    console.log(`[3] Final URL after navigation: ${page.url()}`);
    console.log(`[4] Page title: ${await page.title()}`);

    await page.waitForTimeout(2000);

    const bodyText = await page.innerText('body');
    console.log(`[5] Body text (first 400 chars):`);
    console.log(`    "${bodyText.substring(0, 400)}"`);

    // Check inputs
    const inputCount = await page.locator('input').count();
    console.log(`[6] Inputs found: ${inputCount}`);

    if (inputCount > 0) {
      for (let i = 0; i < Math.min(3, inputCount); i++) {
        const type = await page.locator('input').nth(i).getAttribute('type');
        const placeholder = await page.locator('input').nth(i).getAttribute('placeholder');
        console.log(`    Input ${i}: type="${type}" placeholder="${placeholder}"`);
      }
    }

    console.log(`\n=== CONCLUSION ===`);
    if (page.url().includes('dashboard')) {
      console.log('ROUTED TO: /dashboard (session valid or no auth required)');
    } else {
      console.log(`ROUTED TO: ${page.url()}`);
    }

  } catch (error) {
    console.error(`ERROR: ${error.message}`);
  } finally {
    await browser.close();
  }
})();
