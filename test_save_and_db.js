const { chromium } = require('playwright');
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  'https://wuqngvmaw4naajldkufxxu.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJodHRwczovL3d1cW5ndm1hdzRuYWFqbGRrdWZ4eHUuc3VwYWJhc2UuY28iLCJyZWYiOiJ2MSIsInJvbGUiOiJzZXJ2aWNlX3JvbGUiLCJpYXQiOjE3MTEwMDAwMDAsImV4cCI6MTc0MjUzNjAwMH0.XXXXXXXX'
);

(async () => {
  const browser = await chromium.launch({ headless: false });
  const page = await browser.newPage();

  let saveRequestFired = false;

  page.on('response', response => {
    if (response.url().includes('save-diagnostic') || response.url().includes('/api/') && response.url().includes('diagnostic')) {
      saveRequestFired = true;
      console.log(`✓ Save request fired: ${response.status()}`);
    }
  });

  try {
    // Login
    await page.goto('http://localhost:3004/login', { waitUntil: 'networkidle' });
    await page.fill('input[type="email"]', 'noe@envirojim.com');
    await page.fill('input[type="password"]', 'EnviroJim2024!');
    await page.click('button:has-text("Sign in"), button:has-text("Login"), button[type="submit"]');
    await page.waitForNavigation({ waitUntil: 'networkidle', timeout: 30000 });
    console.log('✓ LOGIN SUCCESS');

    // TITAN - DIAGNOSTICS TAB
    await page.goto('http://localhost:3004/dashboard/machines/4a0709db-ffd0-49a6-b689-ff476b12c687', { waitUntil: 'networkidle' });
    await page.waitForTimeout(1000);

    const buttons = await page.locator('button').allTextContents();
    const diagnosticsIdx = buttons.indexOf('Diagnostics');
    await page.locator('button').nth(diagnosticsIdx).click();
    await page.waitForTimeout(1500);
    console.log('✓ DIAGNOSTICS TAB OPENED');

    // Execute query
    const inputs = await page.locator('input').count();
    for (let i = 0; i < inputs; i++) {
      const placeholder = await page.locator('input').nth(i).getAttribute('placeholder');
      if (placeholder && (placeholder.includes('air') || placeholder.includes('hydraulic') || placeholder.includes('component'))) {
        await page.locator('input').nth(i).fill('pressure valve');
        const siblings = await page.locator('input').nth(i).locator('..').first().locator('button');
        const searchBtn = siblings.first();
        if (await searchBtn.isVisible()) {
          await searchBtn.click();
          console.log('✓ QUERY EXECUTED: pressure valve');
          await page.waitForTimeout(3000);
        }
        break;
      }
    }

    // Click Save button
    const saveBtn = await page.locator('button:has-text("Save"), button:has-text("Sauvegarder")').first();
    if (await saveBtn.isVisible()) {
      await saveBtn.click();
      console.log('✓ SAVE BUTTON CLICKED');
      await page.waitForTimeout(2000);
    }

    // Check database for new ticket
    console.log('\nChecking database for new ticket...');
    const { data: tickets, error } = await supabase
      .from('internal_tickets')
      .select('*')
      .eq('machine_id', '4a0709db-ffd0-49a6-b689-ff476b12c687')
      .eq('title', 'Diagnostic: pressure valve')
      .order('created_at', { ascending: false })
      .limit(1);

    if (error) {
      console.log(`✗ DB query error: ${error.message}`);
    } else if (tickets && tickets.length > 0) {
      const ticket = tickets[0];
      console.log(`✓ TICKET FOUND IN DB`);
      console.log(`  ID: ${ticket.id}`);
      console.log(`  Title: ${ticket.title}`);
      console.log(`  Status: ${ticket.status}`);
      console.log(`  Created: ${ticket.created_at}`);

      // Now check if ticket is visible in TicketsTab
      const ticketsBtn = await page.locator('button:has-text("Tickets")').first();
      if (await ticketsBtn.isVisible()) {
        await ticketsBtn.click();
        await page.waitForTimeout(1000);
        console.log(`✓ TICKETS TAB OPENED`);

        const ticketContent = await page.content();
        if (ticketContent.includes('pressure valve') || ticketContent.includes('Diagnostic')) {
          console.log(`✓ TICKET VISIBLE IN TICKETS TAB`);
        } else {
          console.log(`✗ TICKET NOT VISIBLE in TicketsTab`);
        }
      }
    } else {
      console.log(`✗ No ticket found in database`);
    }

  } catch (error) {
    console.error('ERROR:', error.message);
  } finally {
    await browser.close();
  }
})();
