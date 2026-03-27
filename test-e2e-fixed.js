const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: false });
  const context = await browser.newContext();
  const page = await context.newPage();
  
  try {
    console.log('\n=== LOGIN ===');
    await page.goto('http://localhost:3000/login', { waitUntil: 'networkidle' });
    await page.waitForLoadState('domcontentloaded');
    await page.waitForLoadState('networkidle');
    
    // Attendre le rendu React
    await page.waitForTimeout(1000);
    
    // Remplir via get_by_placeholder ou get_by_label
    const emailInput = page.locator('input[name="email"]');
    const passwordInput = page.locator('input[name="password"]');
    const submitButton = page.locator('button[type="submit"]');
    
    console.log(`Email input found: ${await emailInput.isVisible()}`);
    console.log(`Password input found: ${await passwordInput.isVisible()}`);
    console.log(`Submit button found: ${await submitButton.isVisible()}`);
    
    await emailInput.fill('noe@envirojim.com');
    await passwordInput.fill('EnviroJim2024!');
    
    // Attendre et cliquer
    await submitButton.click({ force: true });
    
    // Attendre la navigation et/ou réponse réseau
    await page.waitForLoadState('networkidle').catch(() => null);
    await page.waitForTimeout(2000);
    
    const finalUrl = page.url();
    console.log(`Final URL: ${finalUrl}`);
    
    const pageTitle = await page.title();
    console.log(`Page title: ${pageTitle}`);
    
    // Vérifier cookies
    const cookies = await context.cookies();
    console.log(`Cookies count: ${cookies.length}`);
    cookies.forEach(c => {
      if (c.name.includes('auth') || c.name.includes('sb')) {
        console.log(`✅ Cookie found: ${c.name}`);
      }
    });
    
    // Vérifier si on est sur dashboard
    if (!finalUrl.includes('/login')) {
      console.log('✅ ON DASHBOARD');
    } else {
      console.log('❌ STILL ON LOGIN');
    }
    
  } catch (err) {
    console.error('Error:', err.message);
  }
  
  await browser.close();
})();
