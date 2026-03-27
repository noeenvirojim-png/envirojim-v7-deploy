const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: false });
  const context = await browser.newContext();
  const page = await context.newPage();
  
  const results = {};
  
  try {
    console.log('\n=== FINAL LOGIN TEST ===');
    await page.goto('http://localhost:3000/login', { waitUntil: 'networkidle' });
    await page.waitForTimeout(2000);
    
    results.page_opened = 'PASS';
    
    // Remplir
    await page.locator('input[name="email"]').fill('noe@envirojim.com');
    await page.locator('input[name="password"]').fill('EnviroJim2024!');
    results.credentials_filled = 'PASS';
    
    // Listener pour la requête auth
    let authRequestMade = false;
    page.on('request', req => {
      if (req.url().includes('/api/auth/login')) {
        authRequestMade = true;
        console.log(`✅ Auth request intercepted: ${req.method()} ${req.url()}`);
      }
    });
    
    // Cliquer submit
    await page.locator('button[type="submit"]').click();
    results.button_clicked = 'PASS';
    
    // Attendre
    await page.waitForLoadState('networkidle').catch(() => null);
    await page.waitForTimeout(2000);
    
    results.auth_request_sent = authRequestMade ? 'PASS' : 'FAIL';
    
    // Vérifier cookies
    const cookies = await context.cookies();
    const authCookie = cookies.find(c => c.name.includes('sb') || c.name.includes('auth'));
    results.cookie_stored = authCookie ? 'PASS' : 'FAIL';
    
    if (authCookie) {
      console.log(`✅ Auth cookie found: ${authCookie.name}`);
    }
    
    // Vérifier URL finale
    const finalUrl = page.url();
    results.final_url = finalUrl;
    
    if (!finalUrl.includes('/login')) {
      results.dashboard_visible = 'PASS';
      console.log(`✅ Dashboard visible at: ${finalUrl}`);
    } else {
      results.dashboard_visible = 'FAIL';
      console.log(`❌ Still on login: ${finalUrl}`);
    }
    
  } catch (err) {
    console.error('Error:', err.message);
    results.error = err.message;
  }
  
  console.log('\n=== RESULTS ===');
  console.log(JSON.stringify(results, null, 2));
  
  await browser.close();
})();
