const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: false });
  const context = await browser.newContext();
  const page = await context.newPage();
  
  // Log console
  page.on('console', msg => {
    if (msg.type() === 'error') {
      console.log(`🔴 CONSOLE ERROR: ${msg.text()}`);
    }
  });
  
  page.on('error', err => {
    console.log(`🔴 PAGE ERROR: ${err.message}`);
  });
  
  try {
    console.log('\n=== DIAGNOSTICS ===');
    await page.goto('http://localhost:3000/login', { waitUntil: 'networkidle' });
    await page.waitForTimeout(2000);
    
    // Évaluer JS pour vérifier React
    const formElement = await page.evaluate(() => {
      const form = document.querySelector('form');
      return {
        exists: !!form,
        hasOnSubmit: !!form?.onsubmit,
        htmlString: form?.outerHTML.substring(0, 200)
      };
    });
    
    console.log(`Form exists: ${formElement.exists}`);
    console.log(`Form has onsubmit: ${formElement.hasOnSubmit}`);
    
    // Remplir les champs
    const emailInput = page.locator('input[name="email"]');
    const passwordInput = page.locator('input[name="password"]');
    
    await emailInput.fill('noe@envirojim.com');
    await passwordInput.fill('EnviroJim2024!');
    
    console.log('\nBefore submit:');
    console.log(`Email value: ${await emailInput.inputValue()}`);
    console.log(`Password value: ${await passwordInput.inputValue()}`);
    
    // Essayer d'envoyer avec Enter au lieu de cliquer
    await passwordInput.press('Enter');
    
    console.log('\nAfter Enter press:');
    await page.waitForTimeout(2000);
    console.log(`Final URL: ${page.url()}`);
    
  } catch (err) {
    console.error('Error:', err.message);
  }
  
  await browser.close();
})();
