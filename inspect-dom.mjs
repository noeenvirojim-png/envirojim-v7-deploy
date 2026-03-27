import { chromium } from 'playwright';

const browser = await chromium.launch({ headless: false });
const context = await browser.newContext();
const page = await context.newPage();

try {
  // Login
  await page.goto('http://localhost:3001/login');
  await page.fill('input[type="email"]', 'noe@envirojim.com');
  await page.fill('input[type="password"]', 'EnviroJim2024!');
  await page.click('button[type="submit"]');
  await page.waitForNavigation();

  // Go to Titan
  const titanId = '4a0709db-ffd0-49a6-b689-ff476b12c687';
  await page.goto(`http://localhost:3001/dashboard/machines/${titanId}`);
  await page.waitForTimeout(1000);

  // Click Diagnostics tab
  const tabs = await page.$$('[role="tab"]');
  for (const tab of tabs) {
    const text = await tab.textContent();
    if (text?.includes('Diagnostic')) {
      await tab.click();
      break;
    }
  }

  await page.waitForTimeout(1000);

  // Get all inputs
  const inputs = await page.$$('input');
  console.log(`\n=== TITAN INPUTS (${inputs.length}) ===`);
  for (let i = 0; i < inputs.length; i++) {
    const placeholder = await inputs[i].getAttribute('placeholder');
    const type = await inputs[i].getAttribute('type');
    const className = await inputs[i].getAttribute('class');
    console.log(`Input ${i}: type=${type}, placeholder="${placeholder}"`);
  }

  // Get all visible inputs
  const visibleInputs = await page.locator('input:visible').all();
  console.log(`\nVisible inputs: ${visibleInputs.length}`);
  for (let i = 0; i < visibleInputs.length && i < 5; i++) {
    const placeholder = await visibleInputs[i].getAttribute('placeholder');
    console.log(`  Visible ${i}: placeholder="${placeholder}"`);
  }

  // Get all buttons
  const buttons = await page.$$('button');
  console.log(`\n=== TITAN BUTTONS (${buttons.length}) ===`);
  for (let i = 0; i < Math.min(10, buttons.length); i++) {
    const text = await buttons[i].textContent();
    const disabled = await buttons[i].getAttribute('disabled');
    console.log(`Button ${i}: "${text?.substring(0, 30)}" disabled=${disabled}`);
  }

  // Go to VB750
  const vb750Id = 'd6da048e-11a1-40ae-a61f-18f81614137e';
  await page.goto(`http://localhost:3001/dashboard/machines/${vb750Id}`);
  await page.waitForTimeout(1000);

  // Click Diagnostics
  const vbTabs = await page.$$('[role="tab"]');
  for (const tab of vbTabs) {
    const text = await tab.textContent();
    if (text?.includes('Diagnostic')) {
      await tab.click();
      break;
    }
  }

  await page.waitForTimeout(1000);

  // Get VB750 inputs
  const vbInputs = await page.$$('input');
  console.log(`\n=== VB750 INPUTS (${vbInputs.length}) ===`);
  for (let i = 0; i < vbInputs.length; i++) {
    const placeholder = await vbInputs[i].getAttribute('placeholder');
    const type = await vbInputs[i].getAttribute('type');
    console.log(`Input ${i}: type=${type}, placeholder="${placeholder}"`);
  }

  // Get VB750 buttons
  const vbButtons = await page.$$('button');
  console.log(`\n=== VB750 BUTTONS (${vbButtons.length}) ===`);
  for (let i = 0; i < Math.min(15, vbButtons.length); i++) {
    const text = await vbButtons[i].textContent();
    const disabled = await vbButtons[i].getAttribute('disabled');
    console.log(`Button ${i}: "${text?.substring(0, 40)}" disabled=${disabled}`);
  }

  await browser.close();

} catch (error) {
  console.error('Error:', error.message);
  process.exit(1);
}
