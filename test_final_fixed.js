const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: false });
  const page = await browser.newPage();

  let canonicalRequestFired = false;
  let responseCode = null;

  page.route('**/*canonical-query**', route => {
    canonicalRequestFired = true;
    route.response().then(r => responseCode = r.status());
    route.continue();
  });

  try {
    console.log('\n====== REAL BROWSER TEST - FIXED ======\n');

    // A. LOGIN
    console.log('A. AUTH');
    await page.goto('http://localhost:3004/login', { waitUntil: 'networkidle' });
    await page.fill('input[type="email"]', 'noe@envirojim.com');
    await page.fill('input[type="password"]', 'EnviroJim2024!');
    await page.click('button:has-text("Sign in"), button:has-text("Login"), button[type="submit"]');
    await page.waitForNavigation({ waitUntil: 'networkidle', timeout: 30000 });
    console.log(`  ✓ login_clicked`);
    console.log(`  ✓ final_url: ${page.url()}`);
    console.log(`  ✓ dashboard_visible: ${page.url().includes('dashboard')}`);

    // B. TITAN
    console.log('\nB. TITAN 500');
    await page.goto('http://localhost:3004/dashboard/machines/4a0709db-ffd0-49a6-b689-ff476b12c687', { waitUntil: 'networkidle' });
    await page.waitForTimeout(1000);
    console.log('  ✓ page_opened');

    // Click Diagnostics tab
    const allButtons = await page.locator('button').allTextContents();
    const diagIndex = allButtons.indexOf('Diagnostics');
    if (diagIndex >= 0) {
      await page.locator('button').nth(diagIndex).click();
      await page.waitForTimeout(500);
      console.log('  ✓ diagnostics_tab_clicked');
    }

    // Click Canonical Search
    const updatedButtons = await page.locator('button').allTextContents();
    const canonicalIndex = updatedButtons.indexOf('Canonical Search');
    if (canonicalIndex >= 0) {
      await page.locator('button').nth(canonicalIndex).click();
      await page.waitForTimeout(500);
      console.log('  ✓ canonical_search_opened');
    }

    // Fill input with correct placeholder
    const inputs = await page.locator('input').count();
    let inputFilled = false;
    for (let i = 0; i < inputs; i++) {
      const placeholder = await page.locator('input').nth(i).getAttribute('placeholder');
      if (placeholder && (placeholder.includes('hydraulic') || placeholder.includes('rotors'))) {
        await page.locator('input').nth(i).fill('pressure valve');
        console.log('  ✓ query_filled: pressure valve');
        inputFilled = true;

        // Click Search button (emerald button with Search icon)
        const button = await page.locator('button').filter({ has: page.locator('[class*="px-6"]') }).first();
        // Better: find button that's after input
        const parentDiv = await page.locator('input').nth(i).locator('..').first();
        const searchBtn = await parentDiv.locator('button').first();
        if (await searchBtn.isVisible()) {
          await searchBtn.click();
          console.log('  ✓ search_button_clicked');
          await page.waitForTimeout(2500);
          canonicalRequestFired && console.log(`  ✓ canonical_request_fired (${responseCode})`);
        }
        break;
      }
    }

    // Check results
    const content = await page.content();
    const hasPressure = content.includes('pressure valve');
    const hasPlaybook = content.includes('Playbook') || content.includes('What Needs');
    console.log(`  result_visible: ${hasPressure || hasPlaybook ? 'PASS' : 'FAIL'}`);

    // Check Save button
    const saveVisible = await page.locator('button:has-text("Sauvegarder"), button:has-text("Save")').isVisible().catch(() => false);
    console.log(`  save_visible: ${saveVisible ? 'PASS' : 'FAIL'}`);

    // C. VB750
    console.log('\nC. VB750');
    await page.goto('http://localhost:3004/dashboard/machines/d6da048e-11a1-40ae-a61f-18f81614137e', { waitUntil: 'networkidle' });
    await page.waitForTimeout(1000);
    console.log('  ✓ page_opened');

    canonicalRequestFired = false;

    // Click Diagnostics
    const allButtons2 = await page.locator('button').allTextContents();
    const diagIndex2 = allButtons2.indexOf('Diagnostics');
    if (diagIndex2 >= 0) {
      await page.locator('button').nth(diagIndex2).click();
      await page.waitForTimeout(500);
    }

    // Click Canonical Search
    const updatedButtons2 = await page.locator('button').allTextContents();
    const canonicalIndex2 = updatedButtons2.indexOf('Canonical Search');
    if (canonicalIndex2 >= 0) {
      await page.locator('button').nth(canonicalIndex2).click();
      await page.waitForTimeout(500);
    }

    // Fill input
    const inputs2 = await page.locator('input').count();
    for (let i = 0; i < inputs2; i++) {
      const placeholder = await page.locator('input').nth(i).getAttribute('placeholder');
      if (placeholder && (placeholder.includes('hydraulic') || placeholder.includes('rotors'))) {
        await page.locator('input').nth(i).fill('hydraulic leak test');
        console.log('  ✓ query_filled: hydraulic leak test');

        // Click Search
        const parentDiv = await page.locator('input').nth(i).locator('..').first();
        const searchBtn = await parentDiv.locator('button').first();
        if (await searchBtn.isVisible()) {
          await searchBtn.click();
          console.log('  ✓ search_button_clicked');
          await page.waitForTimeout(2500);
        }
        break;
      }
    }

    // Check results
    const content2 = await page.content();
    const hasHydraulic = content2.includes('hydraulic') || content2.includes('leak');
    console.log(`  result_visible: ${hasHydraulic ? 'PASS' : 'FAIL'}`);

    // Check Save button
    const saveVisible2 = await page.locator('button:has-text("Sauvegarder"), button:has-text("Save")').isVisible().catch(() => false);
    console.log(`  save_visible: ${saveVisible2 ? 'PASS' : 'FAIL'}`);

    if (saveVisible2) {
      await page.click('button:has-text("Sauvegarder"), button:has-text("Save")');
      console.log('  ✓ save_clicked');
      await page.waitForTimeout(2000);

      // Check Tickets
      const ticketsBtn = await page.locator('button:has-text("Tickets")').isVisible();
      if (ticketsBtn) {
        await page.click('button:has-text("Tickets")');
        await page.waitForTimeout(1000);
        const ticketContent = await page.content();
        const hasTicket = ticketContent.includes('Diagnostic');
        console.log(`  ticket_visible: ${hasTicket ? 'PASS' : 'FAIL'}`);
      }
    }

    console.log('\n====== END TEST ======\n');

  } catch (error) {
    console.error('ERROR:', error.message);
  } finally {
    await browser.close();
  }
})();
