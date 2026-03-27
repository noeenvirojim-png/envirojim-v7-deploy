const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: false });
  const page = await browser.newPage();

  const requests = [];

  // Intercept all requests
  await page.route('**/*', route => {
    requests.push({
      method: route.request().method(),
      url: route.request().url(),
      time: new Date().toISOString()
    });
    route.continue();
  });

  try {
    await page.goto('http://localhost:3004/login', { waitUntil: 'networkidle' });
    await page.fill('input[type="email"]', 'noe@envirojim.com');
    await page.fill('input[type="password"]', 'EnviroJim2024!');
    await page.click('button:has-text("Sign in"), button:has-text("Login"), button[type="submit"]');
    await page.waitForNavigation({ waitUntil: 'networkidle', timeout: 30000 });

    await page.goto('http://localhost:3004/dashboard/machines/4a0709db-ffd0-49a6-b689-ff476b12c687', { waitUntil: 'networkidle' });
    await page.waitForTimeout(1000);

    console.log('=== BEFORE SEARCH ===');
    const requestsBeforeSearch = requests.length;
    console.log(`Total requests so far: ${requestsBeforeSearch}`);

    // Click Canonical Search
    await page.click('button:has-text("Canonical Search")');
    await page.waitForTimeout(1000);

    // Fill query
    const inputs = await page.locator('input').count();
    for (let i = 0; i < inputs; i++) {
      const placeholder = await page.locator('input').nth(i).getAttribute('placeholder');
      if (placeholder && placeholder.includes('matrix')) {
        console.log(`Filling input ${i} with "pressure valve"`);
        await page.locator('input').nth(i).fill('pressure valve');
        break;
      }
    }

    // Click search
    console.log('Clicking search button...');
    const buttons = await page.locator('button').allTextContents();
    const searchIdx = buttons.findIndex(b => b.includes('Search') || b.includes('Analyzing'));
    if (searchIdx >= 0) {
      console.log(`Found search button at index ${searchIdx}`);
      await page.locator('button').nth(searchIdx).click();
      await page.waitForTimeout(3000);
    } else {
      console.log('Search button not found!');
      console.log('Available buttons:', buttons.slice(15, 25));
    }

    console.log('\n=== AFTER SEARCH ===');
    const requestsAfterSearch = requests.length;
    console.log(`Total requests after search: ${requestsAfterSearch}`);
    console.log(`New requests: ${requestsAfterSearch - requestsBeforeSearch}`);

    // Find canonical-query requests
    const canonicalRequests = requests.filter(r => r.url.includes('canonical-query'));
    console.log(`\nCanonical-query requests: ${canonicalRequests.length}`);
    canonicalRequests.forEach(r => {
      console.log(`  ${r.method} ${r.url}`);
    });

    // List all requests after search
    console.log('\nAll requests since search:');
    requests.slice(requestsBeforeSearch).forEach((r, i) => {
      if (i < 20) {
        console.log(`  ${r.method} ${r.url.substring(r.url.indexOf('/api') || 0 || r.url.substring(r.url.length - 50))}`);
      }
    });

  } catch (error) {
    console.error('ERROR:', error.message);
  } finally {
    await browser.close();
  }
})();
