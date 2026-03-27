const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: false });
  const page = await browser.newPage();

  try {
    // A. LOGIN
    await page.goto('http://localhost:3004/login', { waitUntil: 'networkidle' });
    await page.fill('input[type="email"]', 'noe@envirojim.com');
    await page.fill('input[type="password"]', 'EnviroJim2024!');
    await page.click('button:has-text("Sign in"), button:has-text("Login"), button[type="submit"]');
    await page.waitForNavigation({ waitUntil: 'networkidle', timeout: 30000 });

    console.log('✓ LOGIN PASSED');
    console.log(`✓ URL: ${page.url()}`);

    // B. TITAN
    await page.goto('http://localhost:3004/dashboard/machines/4a0709db-ffd0-49a6-b689-ff476b12c687', { waitUntil: 'networkidle' });
    await page.waitForTimeout(1000);

    // Click Diagnostics
    const buttons1 = await page.locator('button').allTextContents();
    const diagIdx = buttons1.indexOf('Diagnostics');
    await page.locator('button').nth(diagIdx).click();
    await page.waitForTimeout(500);

    // Click Canonical Search
    const buttons2 = await page.locator('button').allTextContents();
    const canonicalIdx = buttons2.indexOf('Canonical Search');
    await page.locator('button').nth(canonicalIdx).click();
    await page.waitForTimeout(500);

    // Find the input
    const inputs = await page.locator('input').count();
    for (let i = 0; i < inputs; i++) {
      const placeholder = await page.locator('input').nth(i).getAttribute('placeholder');
      if (placeholder && (placeholder.includes('hydraulic') || placeholder.includes('rotors'))) {
        // Found the right input
        await page.locator('input').nth(i).fill('pressure valve');

        // Get the button next to this input
        const siblings = await page.locator('input').nth(i).locator('..').first().locator('button');
        const searchBtn = siblings.first();

        if (await searchBtn.isVisible()) {
          await searchBtn.click();
          console.log('✓ TITAN: search clicked');
          await page.waitForTimeout(3000);
        }

        // Check if results appear
        const content = await page.content();
        if (content.includes('pressure valve') || content.includes('What Needs')) {
          console.log('✓ TITAN: results visible');
        } else {
          console.log('✗ TITAN: results NOT visible');
        }

        // Check Save button
        const hasSearch = await page.locator('button:has-text("Search")').count() > 0;
        const hasSave = await page.locator('button:has-text("Sauvegarder"), button:has-text("Save")').count() > 0;
        console.log(`✓ TITAN: Save button = ${hasSave}`);

        break;
      }
    }

    // C. VB750
    await page.goto('http://localhost:3004/dashboard/machines/d6da048e-11a1-40ae-a61f-18f81614137e', { waitUntil: 'networkidle' });
    await page.waitForTimeout(1000);

    const buttons3 = await page.locator('button').allTextContents();
    const diagIdx2 = buttons3.indexOf('Diagnostics');
    await page.locator('button').nth(diagIdx2).click();
    await page.waitForTimeout(500);

    const buttons4 = await page.locator('button').allTextContents();
    const canonicalIdx2 = buttons4.indexOf('Canonical Search');
    await page.locator('button').nth(canonicalIdx2).click();
    await page.waitForTimeout(500);

    const inputs2 = await page.locator('input').count();
    for (let i = 0; i < inputs2; i++) {
      const placeholder = await page.locator('input').nth(i).getAttribute('placeholder');
      if (placeholder && (placeholder.includes('hydraulic') || placeholder.includes('rotors'))) {
        await page.locator('input').nth(i).fill('hydraulic leak test');

        const siblings = await page.locator('input').nth(i).locator('..').first().locator('button');
        const searchBtn = siblings.first();

        if (await searchBtn.isVisible()) {
          await searchBtn.click();
          console.log('✓ VB750: search clicked');
          await page.waitForTimeout(3000);
        }

        const content = await page.content();
        if (content.includes('hydraulic') || content.includes('leak') || content.includes('What Needs')) {
          console.log('✓ VB750: results visible');
        } else {
          console.log('✗ VB750: results NOT visible');
        }

        const hasSave = await page.locator('button:has-text("Sauvegarder"), button:has-text("Save")').count() > 0;
        console.log(`✓ VB750: Save button = ${hasSave}`);

        if (hasSave) {
          await page.click('button:has-text("Sauvegarder"), button:has-text("Save")');
          console.log('✓ VB750: Save clicked');
          await page.waitForTimeout(2000);

          const ticketsBtn = await page.locator('button:has-text("Tickets")').count() > 0;
          if (ticketsBtn) {
            await page.click('button:has-text("Tickets")');
            await page.waitForTimeout(1000);
            const hasTicket = (await page.content()).includes('Diagnostic');
            console.log(`✓ VB750: Ticket visible = ${hasTicket}`);
          }
        }

        break;
      }
    }

  } catch (error) {
    console.error('✗ ERROR:', error.message);
  } finally {
    await browser.close();
  }
})();
