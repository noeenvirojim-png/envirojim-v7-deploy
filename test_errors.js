const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: false });
  const page = await browser.newPage();

  // Capture console and network logs
  const consoleLogs = [];
  const networkLogs = [];

  page.on('console', msg => {
    consoleLogs.push(`[${msg.type()}] ${msg.text()}`);
  });

  page.on('response', response => {
    if (response.url().includes('canonical-query')) {
      networkLogs.push(`${response.status()} ${response.url()}`);
    }
  });

  try {
    // Login
    await page.goto('http://localhost:3004/login', { waitUntil: 'networkidle' });
    await page.fill('input[type="email"]', 'noe@envirojim.com');
    await page.fill('input[type="password"]', 'EnviroJim2024!');
    await page.click('button:has-text("Sign in"), button:has-text("Login"), button[type="submit"]');
    await page.waitForNavigation({ waitUntil: 'networkidle', timeout: 30000 });

    // Go to Titan
    await page.goto('http://localhost:3004/dashboard/machines/4a0709db-ffd0-49a6-b689-ff476b12c687', { waitUntil: 'networkidle' });
    await page.waitForTimeout(1000);

    // Click Canonical Search
    await page.click('button:has-text("Canonical Search")');
    await page.waitForTimeout(500);

    // Fill and submit query
    const inputs = await page.locator('input').count();
    for (let i = 0; i < inputs; i++) {
      const placeholder = await page.locator('input').nth(i).getAttribute('placeholder');
      if (placeholder && placeholder.includes('matrix')) {
        await page.locator('input').nth(i).fill('pressure valve');
        break;
      }
    }

    const buttons = await page.locator('button').allTextContents();
    const searchIdx = buttons.findIndex(b => b.includes('Search'));
    if (searchIdx >= 0) {
      await page.locator('button').nth(searchIdx).click();
      await page.waitForTimeout(3000);
    }

    console.log('\n=== CONSOLE LOGS ===');
    consoleLogs.forEach(log => console.log(log));

    console.log('\n=== NETWORK LOGS ===');
    networkLogs.forEach(log => console.log(log));

    console.log('\n=== PAGE CONTENT SEARCH ===');
    const content = await page.content();
    const hasPressureValve = content.includes('pressure valve');
    const hasResults = content.includes('What Needs') || content.includes('Playbook');
    const hasError = content.includes('error') || content.includes('Error');
    console.log(`Has "pressure valve": ${hasPressureValve}`);
    console.log(`Has "What Needs"/Playbook: ${hasResults}`);
    console.log(`Has error: ${hasError}`);

    // Get the actual DOM structure around results
    const resultSection = await page.locator('[class*="result"], [class*="Attention"], [class*="diagnostic"]').first();
    if (await resultSection.isVisible().catch(() => false)) {
      const text = await resultSection.textContent();
      console.log(`\nResult section found: ${text.substring(0, 150)}`);
    } else {
      console.log('\nNo result section visible');
    }

    // Check for loading state
    const loading = await page.locator('text=/Loading|Analyzing|loading/i').isVisible().catch(() => false);
    console.log(`Still loading: ${loading}`);

  } catch (error) {
    console.error('ERROR:', error.message);
  } finally {
    await browser.close();
  }
})();
