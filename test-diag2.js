const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: false });
  const page = await browser.newPage();

  try {
    await page.goto('http://localhost:3004/login');
    console.log('Waiting for networkidle...');
    await page.waitForLoadState('networkidle');
    console.log('URL:', page.url());

    const inputCount = await page.locator('input').count();
    console.log(`Inputs after networkidle: ${inputCount}`);

    // Try to find any form
    const forms = await page.locator('form').count();
    console.log(`Forms: ${forms}`);

    // Try to find iframes
    const iframes = await page.locator('iframe').count();
    console.log(`Iframes: ${iframes}`);

    // Get page content
    const pageText = await page.innerText('body');
    console.log('Page text length:', pageText.length);
    console.log('First 200 chars:', pageText.substring(0, 200));

  } catch (error) {
    console.error('ERROR:', error.message);
  } finally {
    await browser.close();
  }
})();
