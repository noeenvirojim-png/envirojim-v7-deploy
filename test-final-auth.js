const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: false });
  const context = await browser.newContext();
  const page = await context.newPage();
  
  const results = {};
  
  try {
    console.log('\n=== FINAL AUTH TEST ===');
    await page.goto('http://localhost:3000/login', { waitUntil: 'networkidle' });
    results.page_opened = 'PASS';
    
    // Écouter les requêtes
    let authRequestData = null;
    page.on('response', async res => {
      if (res.url().includes('/api/auth/login') && res.status() === 200) {
        authRequestData = await res.json();
        console.log(`✅ Auth response: ${JSON.stringify(authRequestData).slice(0, 100)}`);
      }
    });
    
    // Remplir
    await page.locator('input[name="email"]').fill('noe@envirojim.com');
    await page.locator('input[name="password"]').fill('EnviroJim2024!');
    results.credentials_filled = 'PASS';
    
    // Cliquer
    await page.locator('button[type="submit"]').click();
    results.login_clicked = 'PASS';
    
    // Attendre
    await page.waitForLoadState('networkidle').catch(() => null);
    await page.waitForTimeout(2000);
    
    results.auth_request_sent = authRequestData ? 'PASS' : 'FAIL';
    
    // Vérifier cookies
    const cookies = await context.cookies();
    const authCookie = cookies.find(c => c.name.includes('sb') || c.name.includes('auth'));
    results.auth_cookie_stored = authCookie ? 'PASS' : 'FAIL';
    if (authCookie) console.log(`✅ Cookie: ${authCookie.name}`);
    
    // URL finale
    const finalUrl = page.url();
    results.final_url = finalUrl;
    results.dashboard_visible = !finalUrl.includes('/login') ? 'PASS' : 'FAIL';
    
    console.log(`\n✅ Final URL: ${finalUrl}`);
    if (results.dashboard_visible === 'PASS') {
      console.log('✅ DASHBOARD VISIBLE - LOGIN PROVEN');
    } else {
      console.log(`❌ Redirected to login query params`);
    }
    
  } catch (err) {
    console.error('❌ Error:', err.message);
    results.error = err.message;
  }
  
  console.log('\n=== RESULTS ===');
  Object.entries(results).forEach(([k, v]) => console.log(`${k}: ${v}`));
  
  await browser.close();
})();
