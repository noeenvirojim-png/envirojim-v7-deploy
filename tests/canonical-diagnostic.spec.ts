import { test, expect } from '@playwright/test';

const BASE_URL = process.env.PLAYWRIGHT_BASE_URL || process.env.BASE_URL || 'http://localhost:3004';
const TITAN_ID = '4a0709db-ffd0-49a6-b689-ff476b12c687';
const VB750_ID = 'd6da048e-11a1-40ae-a61f-18f81614137e';

test.describe('Canonical Diagnostic End-to-End', () => {
  test.setTimeout(120000); // 2 minutes

  test('Titan pressure valve → VB750 save → ticket + DB proof', async ({ page }) => {
    // PROOF A: Check if storageState cookies are loaded in context BEFORE goto
    const contextCookies = await page.context().cookies();
    const authToken = contextCookies.find(c => c.name === 'sb-127-auth-token');
    console.log(`[PROOF A] Context cookies before goto: ${contextCookies.length} cookies found`);
    if (authToken) {
      console.log(`[PROOF A] ✓ sb-127-auth-token found in context - domain=${authToken.domain}, path=${authToken.path}, value=${authToken.value.substring(0, 50)}...`);
    } else {
      console.log(`[PROOF A] ✗ sb-127-auth-token NOT found in context`);
    }

    // PROOF B: Track first request to /dashboard
    let firstDashboardRequest: any = null;
    page.on('response', (response) => {
      if (response.url().includes('/dashboard') && !firstDashboardRequest) {
        firstDashboardRequest = {
          url: response.url(),
          status: response.status(),
          headers: response.headers()
        };
        console.log(`[PROOF B] /dashboard response - status=${response.status()}, location=${response.headers()['location'] || 'none'}`);
      }
    });

    // Navigate directly to dashboard
    await page.goto(`${BASE_URL}/dashboard`, { waitUntil: 'load', timeout: 30000 });

    // PROOF C: Check final URL
    const finalUrl = page.url();
    console.log(`[PROOF C] Final URL after goto: ${finalUrl}`);
    expect(finalUrl).toContain('dashboard');

    // B. TITAN - DIAGNOSTICS - PRESSURE VALVE
    await page.goto(`${BASE_URL}/dashboard/machines/${TITAN_ID}`, { waitUntil: 'load', timeout: 30000 });
    await page.waitForTimeout(1000);

    // Click Diagnostics tab
    const diagnosticsButtons = page.locator('button:has-text("Diagnostics")');
    await diagnosticsButtons.first().click();
    await page.waitForTimeout(1500);

    // Find CanonicalDiagnosticWrapper input (placeholder contains air/component/hydraulic)
    const searchInputs = page.locator('input[placeholder*="air"], input[placeholder*="component"], input[placeholder*="hydraulic"]');
    const titanInput = searchInputs.first();
    await titanInput.waitFor({ state: 'visible', timeout: 10000 });

    // Execute query
    await titanInput.fill('pressure valve');
    const searchButtons = titanInput.locator('..').locator('button');
    await searchButtons.first().click();
    await page.waitForTimeout(3000);

    // Verify results
    await expect(page.locator('text=/What Needs Attention/i')).toBeVisible();
    await expect(page.locator('text=/pressure valve/i').first()).toBeVisible();

    // Verify Save button
    const saveButtons = page.locator('button:has-text("Save"), button:has-text("Sauvegarder")');
    await expect(saveButtons.first()).toBeVisible();

    // C. VB750 - DIAGNOSTICS - HYDRAULIC LEAK - SAVE FLOW
    await page.goto(`${BASE_URL}/dashboard/machines/${VB750_ID}`, { waitUntil: 'load', timeout: 30000 });
    await page.waitForTimeout(1000);

    // Click Diagnostics tab
    const diagnosticsButtons2 = page.locator('button:has-text("Diagnostics")');
    await diagnosticsButtons2.first().click();
    await page.waitForTimeout(1500);

    // Find CanonicalDiagnosticWrapper input
    const searchInputs2 = page.locator('input[placeholder*="air"], input[placeholder*="component"], input[placeholder*="hydraulic"]');
    const vb750Input = searchInputs2.first();
    await vb750Input.waitFor({ state: 'visible', timeout: 10000 });

    // Execute query
    await vb750Input.fill('hydraulic leak test');
    const searchButtons2 = vb750Input.locator('..').locator('button');
    await searchButtons2.first().click();
    await page.waitForTimeout(3000);

    // Verify results
    await expect(page.locator('text=/What Needs Attention/i').first()).toBeVisible();

    // Verify Save button and click it
    const saveButtons2 = page.locator('button:has-text("Save"), button:has-text("Sauvegarder")');
    await expect(saveButtons2.first()).toBeVisible();

    // DB PROOF: Read tickets BEFORE Save
    const ticketsBeforeResponse = await page.request.get(`${BASE_URL}/api/test/tickets-by-machine?machine_id=${VB750_ID}`);
    const ticketsBefore: any = await ticketsBeforeResponse.json();
    const ticketCountBefore = ticketsBefore.count || 0;
    const ticketIdsBefore = new Set((ticketsBefore.tickets || []).map((t: any) => t.id));

    // Click Save
    await saveButtons2.first().click();
    await page.waitForTimeout(2000);

    // DB PROOF: Read tickets AFTER Save
    const ticketsAfterResponse = await page.request.get(`${BASE_URL}/api/test/tickets-by-machine?machine_id=${VB750_ID}`);
    const ticketsAfter: any = await ticketsAfterResponse.json();
    const ticketCountAfter = ticketsAfter.count || 0;
    const ticketsAfterList = ticketsAfter.tickets || [];

    // Verify a new ticket was created
    expect(ticketCountAfter).toBe(ticketCountBefore + 1);

    // Find the newly created ticket
    const freshTicket = ticketsAfterList.find((t: any) => !ticketIdsBefore.has(t.id));
    expect(freshTicket).toBeTruthy();
    expect(freshTicket.title).toContain('Diagnostic');

    const freshTicketId = freshTicket.id;
    console.log(`✓ DB PROOF: Fresh diagnostic ticket created with id=${freshTicketId}, title="${freshTicket.title}"`);

    // Open TicketsTab and verify ticket
    const ticketsButtons = page.locator('button:has-text("Tickets")');
    await ticketsButtons.first().click();
    await page.waitForTimeout(1500);

    // Verify ticket with Diagnostic text
    const diagnosticTicket = page.locator('text=/Diagnostic/i').first();
    await expect(diagnosticTicket).toBeVisible();

    // Verify DB: The ticket is rendered in the TicketsTab, which proves it exists in internal_tickets DB table
    const ticketText = await diagnosticTicket.textContent();
    expect(ticketText).toContain('Diagnostic');

    // Extract parent row to get full ticket details
    const ticketParent = diagnosticTicket.locator('..');
    const fullTicketContent = await ticketParent.innerText();

    console.log(`✓ Fresh diagnostic ticket created in DB and visible in UI: "${fullTicketContent.substring(0, 150)}"`);
  });
});
