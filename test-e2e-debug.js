const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: false });
  const context = await browser.newContext();
  const page = await context.newPage();
  
  // Écouter les requêtes
  page.on('request', req => {
    if (req.url().includes('auth')) {
      console.log(`📤 REQUEST: ${req.method()} ${req.url()}`);
    }
  });
  
  page.on('response', res => {
    if (res.url().includes('auth')) {
      console.log(`📥 RESPONSE: ${res.status()} ${res.url()}`);
    }
  });
  
  try {
    console.log('\n=== LOADING LOGIN PAGE ===');
    await page.goto('http://localhost:3000/login');
    
    // Vérifier si les champs existent
    const emailField = await page.$('input#email').catch(() => null);
    const passwordField = await page.$('input#password').catch(() => null);
    const submitBtn = await page.$('button[type="submit"]').catch(() => null);
    
    console.log(`Email field: ${!!emailField}`);
    console.log(`Password field: ${!!passwordField}`);
    console.log(`Submit button: ${!!submitBtn}`);
    
    if (!emailField || !passwordField || !submitBtn) {
      console.log('❌ Form fields not found');
      const pageContent = await page.content();
      console.log(pageContent.includes('email') ? '✅ Page contains email' : '❌ No email in page');
    }
    
    console.log('\n=== FILLING FORM ===');
    if (emailField) await emailField.fill('noe@envirojim.com');
    if (passwordField) await passwordField.fill('EnviroJim2024!');
    
    console.log('\n=== SUBMITTING ===');
    if (submitBtn) {
      await submitBtn.click();
      console.log('Button clicked');
    }
    
    // Attendre les réponses réseau
    await page.waitForTimeout(2000);
    
    const finalUrl = page.url();
    console.log(`\nFinal URL: ${finalUrl}`);
    
  } catch (err) {
    console.error('Error:', err.message);
  }
  
  await browser.close();
})();
