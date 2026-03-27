const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: false });
  const page = await browser.newPage();

  try {
    // Login and navigate
    await page.goto('http://localhost:3004/login', { waitUntil: 'networkidle' });
    await page.fill('input[type="email"]', 'noe@envirojim.com');
    await page.fill('input[type="password"]', 'EnviroJim2024!');
    await page.click('button:has-text("Sign in"), button:has-text("Login"), button[type="submit"]');
    await page.waitForNavigation({ waitUntil: 'networkidle', timeout: 30000 });

    // Go to Titan
    await page.goto('http://localhost:3004/dashboard/machines/4a0709db-ffd0-49a6-b689-ff476b12c687', { waitUntil: 'networkidle' });
    await page.waitForTimeout(1000);

    // Open Canonical Search
    const buttons1 = await page.locator('button').allTextContents();
    const diagIdx = buttons1.indexOf('Diagnostics');
    await page.locator('button').nth(diagIdx).click();
    await page.waitForTimeout(500);

    const buttons2 = await page.locator('button').allTextContents();
    const canonicalIdx = buttons2.indexOf('Canonical Search');
    await page.locator('button').nth(canonicalIdx).click();
    await page.waitForTimeout(500);

    // Execute query
    const inputs = await page.locator('input').count();
    for (let i = 0; i < inputs; i++) {
      const placeholder = await page.locator('input').nth(i).getAttribute('placeholder');
      if (placeholder && (placeholder.includes('hydraulic') || placeholder.includes('rotors'))) {
        await page.locator('input').nth(i).fill('pressure valve');
        const siblings = await page.locator('input').nth(i).locator('..').first().locator('button');
        const searchBtn = siblings.first();
        if (await searchBtn.isVisible()) {
          await searchBtn.click();
          await page.waitForTimeout(3000);
        }
        break;
      }
    }

    // Now list ALL buttons
    console.log('\n=== ALL BUTTONS AFTER SEARCH ===');
    const allButtons = await page.locator('button').allTextContents();
    allButtons.forEach((text, i) => {
      if (text && text.trim()) {
        console.log(`${i}: "${text}"`);
      }
    });

    // Check HTML content for Save/Sauvegarder
    const html = await page.content();
    const hasSauvegarder = html.includes('Sauvegarder');
    const hasSaveText = html.includes('>Save<') || html.includes('>save<');
    console.log(`\nHTML contains "Sauvegarder": ${hasSauvegarder}`);
    console.log(`HTML contains ">Save<": ${hasSaveText}`);

    // Get text of all buttons after search
    console.log('\n=== BUTTONS BY TEXT ===');
    const buttonElements = await page.locator('button');
    const count = await buttonElements.count();
    for (let i = Math.max(0, count - 20); i < count; i++) {
      const text = await buttonElements.nth(i).textContent();
      if (text && text.trim()) {
        console.log(`${i}: "${text.trim().substring(0, 80)}"`);
      }
    }

  } catch (error) {
    console.error('ERROR:', error.message);
  } finally {
    await browser.close();
  }
})();
