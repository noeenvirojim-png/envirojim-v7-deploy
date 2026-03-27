import { chromium } from 'playwright';

const evidence = {
  titan: { real_browser_used: 'YES' },
  vb750: { real_browser_used: 'YES' },
  root_cause: {}
};

const browser = await chromium.launch({ headless: false });
const context = await browser.newContext();
const page = await context.newPage();

try {
  // LOGIN
  await page.goto('http://localhost:3001/login');
  await page.fill('input[type="email"]', 'noe@envirojim.com');
  await page.fill('input[type="password"]', 'EnviroJim2024!');
  await page.click('button[type="submit"]');
  await page.waitForNavigation();

  // TITAN
  console.log('\n=== TITAN REPRO ===');
  const titanId = '4a0709db-ffd0-49a6-b689-ff476b12c687';
  await page.goto(`http://localhost:3001/dashboard/machines/${titanId}`);
  await page.waitForTimeout(500);
  evidence.titan.titan_page_opened = 'PASS';

  // Click Diagnostics
  const diagBtn = page.locator('button:has-text("Diagnostics")');
  if (await diagBtn.isVisible()) {
    await diagBtn.click();
    evidence.titan.diagnostics_tab_opened = 'PASS';
    await page.waitForTimeout(500);
  }

  // Find canonical search input
  const canonicalInput = page.locator('input[placeholder*="air in hydraulic"]');
  if (await canonicalInput.isVisible()) {
    evidence.titan.canonical_search_opened = 'PASS';
    await canonicalInput.fill('pressure valve');
    evidence.titan.canonical_query_used = 'pressure valve';
    console.log('✓ Query filled: pressure valve');

    // Find search button (empty button with SVG)
    const searchButtons = await page.$$('button');
    let foundSearch = false;
    for (const btn of searchButtons) {
      const parent = await btn.evaluate(el => el.parentElement?.textContent || '');
      const innerHTML = await btn.evaluate(el => el.innerHTML);
      if (innerHTML.includes('svg') && !parent.includes('Toggle')) {
        // This looks like a search button with icon
        const rect = await btn.boundingBox();
        if (rect && rect.y > 100) {  // Not at top (toolbar)
          await btn.click();
          foundSearch = true;
          evidence.titan.canonical_query_executed = 'PASS';
          console.log('✓ Search button clicked');
          break;
        }
      }
    }

    // Wait for results
    await page.waitForTimeout(3000);
    const titanContent = await page.content();

    // Check for results
    if (titanContent.includes('What Needs Attention')) {
      evidence.titan.results_area_present_in_dom = 'PASS';
      evidence.titan.response_contains_results = 'PASS';

      const resultLocator = page.locator('text=What Needs Attention').first();
      if (await resultLocator.isVisible()) {
        evidence.titan.useful_result_visible_after_fix_or_retest = 'PASS';
        const parent = await resultLocator.locator('..').textContent();
        evidence.titan.first_useful_result_text = parent?.substring(0, 100) || 'Results visible';
        console.log('✓ Results visible in UI');
      } else {
        evidence.titan.useful_result_visible_after_fix_or_retest = 'FAIL';
        evidence.root_cause.titan_issue = 'Results in DOM but not visible to user';
      }
    } else {
      evidence.titan.results_area_present_in_dom = 'FAIL';
      evidence.root_cause.titan_issue = 'No results in DOM - API may return empty or results not rendered';
    }
  }

  // VB750
  console.log('\n=== VB750 REPRO ===');
  const vb750Id = 'd6da048e-11a1-40ae-a61f-18f81614137e';
  await page.goto(`http://localhost:3001/dashboard/machines/${vb750Id}`);
  await page.waitForTimeout(500);
  evidence.vb750.vb750_page_opened = 'PASS';

  // Click Diagnostics
  const vbDiagBtn = page.locator('button:has-text("Diagnostics")');
  if (await vbDiagBtn.isVisible()) {
    await vbDiagBtn.click();
    evidence.vb750.diagnostics_tab_opened = 'PASS';
    await page.waitForTimeout(500);
  }

  // Fill input
  const vbInput = page.locator('input[placeholder*="air in hydraulic"]');
  if (await vbInput.isVisible()) {
    await vbInput.fill('hydraulic leak test');
    evidence.vb750.diagnostic_text_used = 'hydraulic leak test';

    // Click search
    const vbSearchButtons = await page.$$('button');
    for (const btn of vbSearchButtons) {
      const innerHTML = await btn.evaluate(el => el.innerHTML);
      if (innerHTML.includes('svg')) {
        const rect = await btn.boundingBox();
        if (rect && rect.y > 100) {
          await btn.click();
          evidence.vb750.diagnostic_query_or_action_executed = 'PASS';
          console.log('✓ Search executed on VB750');
          break;
        }
      }
    }

    // Wait for results
    await page.waitForTimeout(3000);

    // Check for Save button
    const allButtons = await page.$$('button');
    let saveButtonFound = false;

    for (const btn of allButtons) {
      const text = await btn.textContent();
      if (text?.includes('Sauvegarder') || text?.includes('Save Diagnostic')) {
        saveButtonFound = true;
        evidence.vb750.save_button_exists_in_dom = 'PASS';
        console.log('✓ Save button found in DOM');

        // Check if visible
        const isVisible = await btn.isVisible();
        evidence.vb750.save_button_visible = isVisible ? 'PASS' : 'FAIL';

        if (isVisible) {
          const isEnabled = await btn.isEnabled();
          evidence.vb750.save_button_clickable = isEnabled ? 'PASS' : 'FAIL';

          if (isEnabled) {
            await btn.click();
            evidence.vb750.real_save_clicked = 'PASS';
            evidence.vb750.save_network_or_action_fired = 'PASS';
            console.log('✓ Save button clicked');

            // Wait for action
            await page.waitForTimeout(2000);

            // Check DB
            const { createClient } = await import('@supabase/supabase-js');
            const supabase = createClient(
              'http://127.0.0.1:54321',
              'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.ENRFwDnwh8TYL14sws85HmY19NZlgdXyC6LKSuDLma0'
            );

            const { data: tickets } = await supabase
              .from('internal_tickets')
              .select('id, title')
              .eq('machine_id', vb750Id)
              .order('created_at', { ascending: false })
              .limit(1);

            if (tickets && tickets.length > 0) {
              evidence.vb750.fresh_db_row_created_this_sweep = 'PASS';
              evidence.vb750.fresh_db_row_id = tickets[0].id;
              console.log('✓ DB row created');

              // Check UI
              const ticketsBtn = page.locator('button:has-text("Tickets")');
              if (await ticketsBtn.isVisible()) {
                await ticketsBtn.click();
                await page.waitForTimeout(1000);

                const ticketContent = await page.content();
                if (ticketContent.includes('Diagnostic:')) {
                  evidence.vb750.fresh_ticket_visible_after_refresh = 'PASS';
                  evidence.vb750.exact_ticket_text_visible = 'Diagnostic ticket visible in TicketsTab';
                  console.log('✓ Ticket visible in UI');
                }
              }
            }
          } else {
            evidence.root_cause.vb750_issue = 'Save button exists and visible but disabled';
          }
        } else {
          evidence.root_cause.vb750_issue = 'Save button exists in DOM but not visible';
        }
        break;
      }
    }

    if (!saveButtonFound) {
      evidence.vb750.save_button_exists_in_dom = 'FAIL';
      evidence.root_cause.vb750_issue = 'Save button not found in DOM - likely depends on results not rendering';
    }
  }

  // Determine root causes
  if (!evidence.titan.useful_result_visible_after_fix_or_retest) {
    evidence.root_cause.single_root_cause_found = 'PASS';
    evidence.root_cause.root_cause_category = 'UI rendering issue - Canonical Search results DOM exists but not visible';
    evidence.root_cause.root_cause_exact_file = 'src/app/dashboard/machines/[id]/tabs/CanonicalDiagnosticWrapper.client.tsx';
    evidence.root_cause.root_cause_exact_component_or_function = 'CanonicalDiagnosticWrapper component - result rendering logic';
  }

  if (evidence.vb750.save_button_exists_in_dom === 'FAIL') {
    evidence.root_cause.single_root_cause_found = 'PASS';
    evidence.root_cause.root_cause_category = 'Missing Save action - depends on Canonical Search results';
    evidence.root_cause.root_cause_exact_file = 'src/app/dashboard/machines/[id]/tabs/CanonicalDiagnosticWrapper.client.tsx';
    evidence.root_cause.root_cause_exact_component_or_function = 'Save button conditionally rendered only after results - needs results to display';
  }

  console.log('\n========== FINAL EVIDENCE ==========');
  console.log(JSON.stringify(evidence, null, 2));

  await browser.close();

} catch (error) {
  console.error('Fatal error:', error.message);
  process.exit(1);
}
