const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: false });
  const page = await browser.newPage();

  try {
    await page.goto('http://localhost:3004/login', { waitUntil: 'load', timeout: 15000 });
    console.log(`URL: ${page.url()}`);
    console.log(`Title: ${await page.title()}`);

    // Count elements
    const inputCount = await page.locator('input').count();
    const buttonCount = await page.locator('button').count();
    console.log(`Inputs: ${inputCount}, Buttons: ${buttonCount}`);

    // Get input details
    for (let i = 0; i < Math.min(5, inputCount); i++) {
      const type = await page.locator('input').nth(i).getAttribute('type');
      const placeholder = await page.locator('input').nth(i).getAttribute('placeholder');
      const name = await page.locator('input').nth(i).getAttribute('name');
      console.log(`Input ${i}: type=${type}, name=${name}, placeholder=${placeholder}`);
    }

    // Check page content
    const pageText = await page.innerText('body');
    const hasLogin = pageText.includes('login') || pageText.includes('Login');
    const hasEmail = pageText.includes('email') || pageText.includes('Email');
    const hasPassword = pageText.includes('password') || pageText.includes('Password');
    console.log(`Has 'login': ${hasLogin}, 'email': ${hasEmail}, 'password': ${hasPassword}`);

  } catch (error) {
    console.error('ERROR:', error.message);
  } finally {
    await browser.close();
  }
})();
