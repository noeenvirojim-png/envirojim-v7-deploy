const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: false });
  const context = await browser.newContext();
  const page = await context.newPage();

  console.log('\n=== AUTH SESSION ===');
  try {
    // A. LOGIN RÉEL
    await page.goto('http://localhost:3004/login', { waitUntil: 'networkidle' });
    console.log(`LOGIN: page opened`);

    await page.fill('input[type="email"]', 'noe@envirojim.com');
    await page.fill('input[type="password"]', 'EnviroJim2024!');
    console.log('LOGIN: credentials filled');

    await page.click('button:has-text("Sign in"), button:has-text("Login"), button[type="submit"]');
    await page.waitForNavigation({ waitUntil: 'networkidle', timeout: 30000 });
    console.log(`LOGIN DONE - URL: ${page.url()}`);

    const dashboardVisible = await page.locator('text=/dashboard|machines|diagnostics/i').isVisible().catch(() => false);
    console.log(`DASHBOARD VISIBLE: ${dashboardVisible ? 'YES' : 'NO'}`);

    console.log('\n=== TITAN 500 ===');
    // B. TITAN
    await page.goto('http://localhost:3004/dashboard/machines/4a0709db-ffd0-49a6-b689-ff476b12c687', { waitUntil: 'networkidle' });
    console.log(`TITAN PAGE: opened`);
    await page.waitForTimeout(1000);

    // Find input
    const input = await page.locator('input[placeholder*="symptom"], input[placeholder*="air"], input[placeholder*="component"]').first();
    if (await input.isVisible()) {
      await input.fill('pressure valve');
      await page.click('button:has-text("Search")');
      await page.waitForTimeout(2000);
      console.log('QUERY: pressure valve executed');
    }

    // Check results
    const resultText = await page.locator('[class*="Attention"], [class*="result"], text=/pressure valve/').first().textContent().catch(() => null);
    if (resultText) {
      console.log(`RESULT: ${resultText.substring(0, 60)}`);
    }

    const saveBtn = await page.locator('button:has-text("Save"), button:has-text("Sauvegarder")').isVisible().catch(() => false);
    console.log(`SAVE VISIBLE: ${saveBtn ? 'YES' : 'NO'}`);

    console.log('\n=== VB750 ===');
    await page.goto('http://localhost:3004/dashboard/machines/d6da048e-11a1-40ae-a61f-18f81614137e', { waitUntil: 'networkidle' });
    console.log(`VB750 PAGE: opened`);
    await page.waitForTimeout(1000);

    const input2 = await page.locator('input[placeholder*="symptom"], input[placeholder*="air"], input[placeholder*="component"]').first();
    if (await input2.isVisible()) {
      await input2.fill('hydraulic leak test');
      await page.click('button:has-text("Search")');
      await page.waitForTimeout(2000);
      console.log('QUERY: hydraulic leak test executed');
    }

    const resultText2 = await page.locator('[class*="Attention"], [class*="result"], text=/hydraulic|leak/').first().textContent().catch(() => null);
    if (resultText2) {
      console.log(`RESULT: ${resultText2.substring(0, 60)}`);
    }

    const saveBtn2 = await page.locator('button:has-text("Save"), button:has-text("Sauvegarder")').isVisible().catch(() => false);
    console.log(`SAVE VISIBLE: ${saveBtn2 ? 'YES' : 'NO'}`);

    if (saveBtn2) {
      await page.click('button:has-text("Save"), button:has-text("Sauvegarder")');
      console.log('SAVE: clicked');
      await page.waitForTimeout(2000);
    }

    const ticketsTab = await page.locator('text=/Tickets|Support|Travaux/').isVisible().catch(() => false);
    if (ticketsTab) {
      await page.click('text=/Tickets|Support|Travaux/');
      await page.waitForTimeout(1000);
      const ticket = await page.locator('text=/Diagnostic|hydraulic/').textContent().catch(() => null);
      console.log(`TICKET: ${ticket ? 'VISIBLE' : 'NOT VISIBLE'}`);
    }

  } catch (error) {
    console.error('ERROR:', error.message);
  } finally {
    await browser.close();
  }
})();
