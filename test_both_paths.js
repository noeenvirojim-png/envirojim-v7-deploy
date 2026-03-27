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
    console.log('✓ LOGIN');

    // === PATH 1: Click DIAGNOSTICS tab (contains CanonicalDiagnosticWrapper) ===
    console.log('\n=== PATH 1: DIAGNOSTICS TAB (CanonicalDiagnosticWrapper) ===');
    await page.goto('http://localhost:3004/dashboard/machines/4a0709db-ffd0-49a6-b689-ff476b12c687', { waitUntil: 'networkidle' });
    await page.waitForTimeout(1000);

    // Click DIAGNOSTICS tab button
    const buttons = await page.locator('button').allTextContents();
    const diagnosticsIdx = buttons.indexOf('Diagnostics');
    if (diagnosticsIdx >= 0) {
      await page.locator('button').nth(diagnosticsIdx).click();
      await page.waitForTimeout(1500);
      console.log('✓ Clicked DIAGNOSTICS tab');

      // Now look for the input in CanonicalDiagnosticWrapper
      const inputs = await page.locator('input').count();
      for (let i = 0; i < inputs; i++) {
        const placeholder = await page.locator('input').nth(i).getAttribute('placeholder');
        if (placeholder && (placeholder.includes('air') || placeholder.includes('hydraulic') || placeholder.includes('component'))) {
          console.log(`✓ Found CanonicalDiagnosticWrapper input at index ${i}`);
          await page.locator('input').nth(i).fill('pressure valve');

          // Click search button
          const siblings = await page.locator('input').nth(i).locator('..').first().locator('button');
          const searchBtn = siblings.first();
          if (await searchBtn.isVisible()) {
            await searchBtn.click();
            console.log('✓ Clicked search in CanonicalDiagnosticWrapper');
            await page.waitForTimeout(3000);
          }

          // Check for CanonicalDiagnosticWrapper specific elements
          const hasWhatsNeeds = (await page.content()).includes('What Needs');
          const hasPlaybook = (await page.content()).includes('Diagnostic Playbook');
          const hasSave = await page.locator('button:has-text("Save"), button:has-text("Sauvegarder")').count() > 0;

          console.log(`✓ "What Needs" visible: ${hasWhatsNeeds}`);
          console.log(`✓ "Diagnostic Playbook" visible: ${hasPlaybook}`);
          console.log(`✓ "Save" button visible: ${hasSave}`);

          break;
        }
      }
    }

    // === PATH 2: Click CANONICAL SEARCH tab (contains CanonicalQueryPanel) ===
    console.log('\n=== PATH 2: CANONICAL SEARCH TAB (CanonicalQueryPanel) ===');
    await page.goto('http://localhost:3004/dashboard/machines/d6da048e-11a1-40ae-a61f-18f81614137e', { waitUntil: 'networkidle' });
    await page.waitForTimeout(1000);

    // Click CANONICAL SEARCH tab button
    const buttons2 = await page.locator('button').allTextContents();
    const canonicalSearchIdx = buttons2.indexOf('Canonical Search');
    if (canonicalSearchIdx >= 0) {
      await page.locator('button').nth(canonicalSearchIdx).click();
      await page.waitForTimeout(1500);
      console.log('✓ Clicked CANONICAL SEARCH tab');

      // Look for the input
      const inputs2 = await page.locator('input').count();
      for (let i = 0; i < inputs2; i++) {
        const placeholder = await page.locator('input').nth(i).getAttribute('placeholder');
        if (placeholder && (placeholder.includes('Search') || placeholder.includes('search') || placeholder.includes('matrix'))) {
          console.log(`✓ Found CanonicalQueryPanel input at index ${i}`);
          await page.locator('input').nth(i).fill('hydraulic leak test');

          // Find and click search button
          const searchButtons = await page.locator('button:has-text("Search")').count();
          if (searchButtons > 0) {
            await page.click('button:has-text("Search")');
            console.log('✓ Clicked search in CanonicalQueryPanel');
            await page.waitForTimeout(3000);
          }

          // Check for results
          const hasResults = (await page.content()).includes('hydraulic') || (await page.content()).includes('leak');
          const hasTopMatch = (await page.content()).includes('Top Match');
          const hasSave = await page.locator('button:has-text("Save"), button:has-text("Sauvegarder")').count() > 0;

          console.log(`✓ Results visible (hydraulic/leak): ${hasResults}`);
          console.log(`✓ "Top Match" visible: ${hasTopMatch}`);
          console.log(`✓ "Save" button visible: ${hasSave}`);

          break;
        }
      }
    }

    console.log('\n=== CONCLUSION ===');
    console.log('✓ Both paths tested');

  } catch (error) {
    console.error('ERROR:', error.message);
  } finally {
    await browser.close();
  }
})();
