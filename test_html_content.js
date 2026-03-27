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

    // Get HTML
    const html = await page.content();
    console.log('Searching for key strings in HTML...\n');

    const searchTerms = [
      'pressure valve',
      'What Needs',
      'Playbook',
      'Diagnostic Playbook',
      'Sauvegarder',
      'Save',
      'playbookSteps',
      'top_cluster',
      'canonical_name'
    ];

    searchTerms.forEach(term => {
      const found = html.includes(term);
      console.log(`"${term}": ${found ? 'FOUND' : 'NOT FOUND'}`);
    });

    // Save HTML to file for inspection
    fs.writeFileSync('/tmp/page_html.txt', html);
    console.log('\nFull HTML saved to /tmp/page_html.txt');

    // Check for error messages
    console.log('\nSearching for error indicators...');
    const errorTerms = ['error', 'Error', 'ERROR', 'failed', 'Failed', 'FAILED', 'undefined', 'null'];
    const errorCount = errorTerms.reduce((count, term) => count + (html.split(term).length - 1), 0);
    console.log(`Error-related terms found: ${errorCount}`);

    // Check for React state variables in page text
    console.log('\nChecking visible page text...');
    const text = await page.innerText('body');
    console.log(`Page text length: ${text.length}`);
    console.log(`First 500 chars:\n${text.substring(0, 500)}`);

  } catch (error) {
    console.error('ERROR:', error.message);
  } finally {
    await browser.close();
  }
})();
