const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: false });
  const page = await browser.newPage();

  const requests = [];
  let canonicalRequestMade = false;

  await page.route('**/*canonical-query**', route => {
    canonicalRequestMade = true;
    console.log(`CANONICAL REQUEST DETECTED: ${route.request().method()} ${route.request().url()}`);
    route.continue();
  });

  try {
    // Login
    await page.goto('http://localhost:3004/login', { waitUntil: 'networkidle' });
    await page.fill('input[type="email"]', 'noe@envirojim.com');
    await page.fill('input[type="password"]', 'EnviroJim2024!');
    await page.click('button:has-text("Sign in"), button:has-text("Login"), button[type="submit"]');
    await page.waitForNavigation({ waitUntil: 'networkidle', timeout: 30000 });
    console.log('✓ LOGIN SUCCESS');

    // Go to Titan
    await page.goto('http://localhost:3004/dashboard/machines/4a0709db-ffd0-49a6-b689-ff476b12c687', { waitUntil: 'networkidle' });
    await page.waitForTimeout(1000);
    console.log('✓ TITAN PAGE LOADED');

    // Find and click Canonical Search button
    const allButtons = await page.locator('button').allTextContents();
    const canonicalSearchIndex = allButtons.indexOf('Canonical Search');
    if (canonicalSearchIndex >= 0) {
      await page.locator('button').nth(canonicalSearchIndex).click();
      await page.waitForTimeout(1500);
      console.log('✓ CLICKED CANONICAL SEARCH BUTTON');
    }

    // Now find the input with placeholder "e.g., air in hydraulic system"
    const allInputs = await page.locator('input').count();
    let foundCorrectInput = false;
    for (let i = 0; i < allInputs; i++) {
      const placeholder = await page.locator('input').nth(i).getAttribute('placeholder');
      if (placeholder && placeholder.includes('air in hydraulic')) {
        console.log(`✓ FOUND CORRECT INPUT AT INDEX ${i}: "${placeholder}"`);
        await page.locator('input').nth(i).fill('pressure valve');
        console.log('✓ FILLED INPUT WITH "pressure valve"');
        foundCorrectInput = true;

        // Now find the button in THIS section
        // The Search button should be a green button with onClick
        // Let's look for visible buttons after the Canonical Search was clicked
        const visibleButtons = await page.locator('button:visible').allTextContents();
        console.log(`\nVisible buttons: ${visibleButtons.slice(0, 25).join(', ')}`);

        // Find a button that's after the input (likely the Search button)
        // It should display either "Search" text (with icon) or be the emerald button
        const searchButtonSelector = 'button:has-text("Search"):visible, button[class*="emerald"]:visible';
        const searchBtn = await page.locator(searchButtonSelector).first();
        if (await searchBtn.isVisible()) {
          console.log('✓ FOUND SEARCH BUTTON');
          await searchBtn.click();
          console.log('✓ CLICKED SEARCH BUTTON');
          await page.waitForTimeout(3000);
        } else {
          console.log('✗ SEARCH BUTTON NOT FOUND');
        }
        break;
      }
    }

    if (!foundCorrectInput) {
      console.log('✗ CORRECT INPUT NOT FOUND');
      console.log('Available inputs:');
      for (let i = 0; i < allInputs; i++) {
        const placeholder = await page.locator('input').nth(i).getAttribute('placeholder');
        console.log(`  ${i}: "${placeholder}"`);
      }
    }

    console.log(`\n✓ Canonical request made: ${canonicalRequestMade}`);

    // Check for results
    const pageContent = await page.content();
    const hasPressureValve = pageContent.includes('pressure valve');
    const hasResults = pageContent.includes('What Needs') || pageContent.includes('Playbook') || pageContent.includes('Diagnostic');
    console.log(`✓ "pressure valve" in DOM: ${hasPressureValve}`);
    console.log(`✓ Results displayed: ${hasResults}`);

    // Check for Save button
    const saveBtn = await page.locator('button:has-text("Sauvegarder"), button:has-text("Save")').isVisible().catch(() => false);
    console.log(`✓ Save button visible: ${saveBtn}`);

  } catch (error) {
    console.error('✗ ERROR:', error.message);
  } finally {
    await browser.close();
  }
})();
