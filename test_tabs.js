const { chromium } = require('playwright');

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

    // Go to Titan
    await page.goto('http://localhost:3004/dashboard/machines/4a0709db-ffd0-49a6-b689-ff476b12c687', { waitUntil: 'networkidle' });
    await page.waitForTimeout(1000);

    // Get all tabs
    const allButtons = await page.locator('button').allTextContents();
    console.log('ALL BUTTONS/TABS:');
    allButtons.forEach((text, i) => {
      if (text && text.trim()) {
        console.log(`  ${i}: "${text}"`);
      }
    });

    console.log('\n=== Checking "Diagnostics" tab ===');
    const diagnosticsIndex = allButtons.indexOf('Diagnostics');
    if (diagnosticsIndex >= 0) {
      console.log(`Found "Diagnostics" at index ${diagnosticsIndex}`);
      await page.locator('button').nth(diagnosticsIndex).click();
      await page.waitForTimeout(1500);
      console.log('Clicked Diagnostics tab');

      // Check what content is now visible
      const content = await page.content();
      const hasCanonical = content.includes('Canonical');
      const hasPlaybook = content.includes('Playbook');
      const hasDiagEngine = content.includes('Diag Engine');
      console.log(`  Has "Canonical": ${hasCanonical}`);
      console.log(`  Has "Playbook": ${hasPlaybook}`);
      console.log(`  Has "Diag Engine": ${hasDiagEngine}`);

      // Now list buttons again
      const buttonsAfterDiagnostics = await page.locator('button').allTextContents();
      console.log('\n  Buttons after opening Diagnostics:');
      buttonsAfterDiagnostics.forEach((text, i) => {
        if (text && text.trim() && (text.includes('Canonical') || text.includes('Engine') || text.includes('Search'))) {
          console.log(`    ${i}: "${text}"`);
        }
      });
    } else {
      console.log('Diagnostics tab NOT FOUND');
    }

  } catch (error) {
    console.error('ERROR:', error.message);
  } finally {
    await browser.close();
  }
})();
