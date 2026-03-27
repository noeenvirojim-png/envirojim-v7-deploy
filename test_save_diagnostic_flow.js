const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || 'http://127.0.0.1:54321',
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const vb750Id = '30000000-0000-0000-0000-111111111111';
const titanId = 'f6e9adf4-7852-42c7-ba1d-6bcaf587e0e8';

(async () => {
  console.log('╔═══════════════════════════════════════════════════════════════╗');
  console.log('║       SAVE DIAGNOSTIC E2E BROWSER FLOW TEST                    ║');
  console.log('╚═══════════════════════════════════════════════════════════════╝\n');

  // SIMULATE: User does diagnostic query on Titan 500
  console.log('SIMULATION: User queries "pressure valve" on Titan 500');
  const { data: queryResult } = await supabase
    .from('canonical_clusters')
    .select('canonical_name, cluster_type')
    .eq('machine_id', titanId)
    .ilike('canonical_name', '%pressure%')
    .limit(1);
  
  if (queryResult?.length > 0) {
    console.log(`  Query result: "${queryResult[0].canonical_name}" (${queryResult[0].cluster_type})`);
    console.log('  ✓ PASS - Query would display in UI\n');
  } else {
    console.log('  ✗ FAIL - No query results\n');
  }

  // SIMULATE: User checks some playbook steps and clicks "Save Diagnostic"
  console.log('SIMULATION: User saves diagnostic on VB750');
  
  // Get current ticket count BEFORE
  const { count: countBefore } = await supabase
    .from('internal_tickets')
    .select('*', { count: 'exact', head: true })
    .eq('machine_id', vb750Id);
  
  console.log(`  Internal tickets BEFORE: ${countBefore || 0}`);

  // CREATE a new diagnostic ticket (simulating saveDiagnosticSession action)
  const { data: newTicket, error: insertErr } = await supabase
    .from('internal_tickets')
    .insert({
      organization_id: 'd01daf6b-0cdb-4e56-a0fd-eee539df1a5a', // from machines table
      machine_id: vb750Id,
      creator_id: '21206e89-612e-4d7e-8d23-52a976fbe271', // test user
      title: 'Diagnostic: Hydraulic System Check',
      description: 'DIAGNOSTIC REPORT\n================\n\nQuery: pressure diagnostic\nCluster Match: Pressure-related issues',
      status: 'OPEN',
      is_transferred_to_envirojim: false
    })
    .select('id')
    .single();

  if (insertErr) {
    console.log(`  ✗ FAIL - Insert error: ${insertErr.message}`);
  } else {
    console.log(`  ✓ Ticket created with ID: ${newTicket.id}`);
    
    // Verify it appears in queries
    const { data: ticketAfter } = await supabase
      .from('internal_tickets')
      .select('id, title, status')
      .eq('machine_id', vb750Id)
      .eq('id', newTicket.id)
      .single();
    
    if (ticketAfter) {
      console.log(`  ✓ Ticket visible in DB: "${ticketAfter.title}" (${ticketAfter.status})`);
      
      // Test: Would TicketsTab display this?
      const { data: allTickets } = await supabase
        .from('internal_tickets')
        .select('*')
        .eq('machine_id', vb750Id)
        .order('created_at', { ascending: false })
        .limit(20);
      
      const ticketInList = (allTickets || []).find(t => t.id === newTicket.id);
      if (ticketInList) {
        console.log(`  ✓ PASS - Ticket appears in TicketsTab query`);
      } else {
        console.log(`  ✗ FAIL - Ticket not in TicketsTab query`);
      }
    } else {
      console.log('  ✗ FAIL - Ticket created but not visible');
    }
  }

  // Test: Check Titan 500 doesn't have tickets yet (sanity check)
  console.log('\n  Sanity check - Titan 500 internal tickets:');
  const { count: titanCount } = await supabase
    .from('internal_tickets')
    .select('*', { count: 'exact', head: true })
    .eq('machine_id', titanId);
  
  console.log(`  Count: ${titanCount || 0}`);

  console.log('\n╔═══════════════════════════════════════════════════════════════╗');
  console.log('║                   FLOW TEST COMPLETE                         ║');
  console.log('╚═══════════════════════════════════════════════════════════════╝');
})();
