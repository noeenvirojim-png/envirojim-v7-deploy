const { chromium } = require('playwright');
const fs = require('fs');

(async () => {
  const browser = await chromium.launch({ headless: false });
  const page = await browser.newPage();

  try {
    // Quick login and search
    await page.goto('http://localhost:3004/login', { waitUntil: 'networkidle' });
    await page.fill('input[type="email"]', 'noe@envirojim.com');
    await page.fill('input[type="password"]', 'EnviroJim2024!');
    await page.click('button:has-text("Sign in"), button:has-text("Login"), button[type="submit"]');
    await page.waitForNavigation({ waitUntil: 'networkidle', timeout: 30000 });

    await page.goto('http://localhost:3004/dashboard/machines/4a0709db-ffd0-49a6-b689-ff476b12c687', { waitUntil: 'networkidle' });
    await page.waitForTimeout(1000);

    const buttons1 = await page.locator('button').allTextContents();
    const diagIdx = buttons1.indexOf('Diagnostics');
    await page.locator('button').nth(diagIdx).click();
    await page.waitForTimeout(500);

    const buttons2 = await page.locator('button').allTextContents();
    const canonicalIdx = buttons2.indexOf('Canonical Search');
    await page.locator('button').nth(canonicalIdx).click();
    await page.waitForTimeout(500);

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

    // Find the element that contains "pressure valve"
    const element = await page.locator('text=/pressure valve/i').first();
    const box = await element.boundingBox();
    const text = await element.textContent();
    const html = await element.innerHTML();

    console.log('\n=== ELEMENT CONTAINING "pressure valve" ===');
    console.log(`Text: "${text.substring(0, 100)}"`);
    console.log(`BoundingBox: ${JSON.stringify(box)}`);
    console.log(`HTML: ${html.substring(0, 200)}`);

    // Get parent elements
    const parent = await element.locator('..').first();
    const parentClass = await parent.getAttribute('class');
    const parentHTML = await parent.innerHTML();
    console.log(`\nParent class: ${parentClass}`);
    console.log(`Parent HTML (first 300): ${parentHTML.substring(0, 300)}`);

    // Look for "What Needs" element
    const whatsNeeds = await page.locator('text=/What Needs/i').first().catch(() => null);
    if (whatsNeeds) {
      console.log('\n✓ "What Needs" element found');
    } else {
      console.log('\n✗ "What Needs" element NOT found');
    }

    // Look for "Diagnostic Playbook"
    const playbook = await page.locator('text=/Diagnostic Playbook/i').first().catch(() => null);
    if (playbook) {
      console.log('✓ "Diagnostic Playbook" element found');
    } else {
      console.log('✗ "Diagnostic Playbook" element NOT found');
    }

    // Take screenshot
    await page.screenshot({ path: '/tmp/canonical_search_result.png' });
    console.log('\nScreenshot saved: /tmp/canonical_search_result.png');

  } catch (error) {
    console.error('ERROR:', error.message);
  } finally {
    await browser.close();
  }
})();
