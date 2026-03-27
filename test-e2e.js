const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: false });
  const context = await browser.newContext();
  const page = await context.newPage();
  
  try {
    console.log('\n=== LOGIN ===');
    await page.goto('http://localhost:3000/login');
    await page.fill('input#email', 'noe@envirojim.com');
    await page.fill('input#password', 'EnviroJim2024!');
    await page.click('button[type="submit"]');
    
    await page.waitForNavigation({ waitUntil: 'networkidle' }).catch(() => null);
    await page.waitForTimeout(2000);
    
    const url = page.url();
    console.log(`URL: ${url}`);
    const cookies = await context.cookies();
    const authCookie = cookies.find(c => c.name.includes('auth'));
    console.log(`Auth cookie: ${!!authCookie}`);
    
    if (!url.includes('login')) {
      console.log('✅ Dashboard accessible');
      
      // Relever le titre ou contenu visible
      const title = await page.title();
      console.log(`Title: ${title}`);
      const content = await page.textContent('h1').catch(() => null);
      console.log(`H1 text: ${content}`);
    } else {
      console.log('❌ Redirection vers login');
    }
    
  } catch (err) {
    console.error('Error:', err.message);
  }
  
  await browser.close();
})();
