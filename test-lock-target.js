const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  console.log('=== PLAYWRIGHT TARGET LOCK ===\n');

  try {
    console.log('[1] Navigating to http://localhost:3004/login...');
    const response = await page.goto('http://localhost:3004/login', {
      waitUntil: 'load',
      timeout: 15000
    });

    console.log(`[2] Navigation status: ${response?.status()}`);
    console.log(`[3] Final URL: ${page.url()}`);
    console.log(`[4] Page title: ${await page.title()}`);

    // Wait a bit for any dynamic content
    await page.waitForTimeout(2000);

    console.log(`[5] Inputs found: ${await page.locator('input').count()}`);
    console.log(`[6] Buttons found: ${await page.locator('button').count()}`);

    // Get visible text
    const bodyText = await page.innerText('body');
    console.log(`[7] Body visible text (first 300 chars):`);
    console.log(`    "${bodyText.substring(0, 300)}"`);

    // Check for forms
    const formCount = await page.locator('form').count();
    console.log(`[8] Forms found: ${formCount}`);

    // Check all input attributes
    const inputCount = await page.locator('input').count();
    if (inputCount > 0) {
      console.log(`[9] Input details:`);
      for (let i = 0; i < inputCount; i++) {
        const type = await page.locator('input').nth(i).getAttribute('type');
        const name = await page.locator('input').nth(i).getAttribute('name');
        const placeholder = await page.locator('input').nth(i).getAttribute('placeholder');
        console.log(`    Input ${i}: type="${type}" name="${name}" placeholder="${placeholder}"`);
      }
    }

    // Test ACTUALLY on the expected page?
    const hasLoginKeyword = bodyText.toLowerCase().includes('login') ||
                           bodyText.toLowerCase().includes('sign in') ||
                           bodyText.toLowerCase().includes('email') ||
                           bodyText.toLowerCase().includes('password');

    console.log(`[10] Contains login keywords: ${hasLoginKeyword}`);

    console.log(`\n=== CONCLUSION ===`);
    console.log(`Match expected manual runtime: ${hasLoginKeyword ? 'LIKELY YES' : 'LIKELY NO'}`);

  } catch (error) {
    console.error(`ERROR: ${error.message}`);
  } finally {
    await browser.close();
  }
})();
