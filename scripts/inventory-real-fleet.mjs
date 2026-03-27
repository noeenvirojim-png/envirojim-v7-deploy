import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const envPath = path.resolve(__dirname, '..', '.env.production');

if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf8');
  envContent.split('\n').forEach(line => {
    const [key, ...valueParts] = line.split('=');
    if (key && !key.startsWith('#')) {
      const value = valueParts.join('=').trim().replace(/^\"|\"$/g, '');
      if (value) process.env[key] = value;
    }
  });
}

async function main() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) throw new Error('Missing env');

  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false }
  });

  console.log('[FLEET INVENTORY] Identifying real machines with documents');
  console.log('=========================================================');

  // Get machines with documents for processing
  const { data: allMachines } = await supabase
    .from('machines')
    .select('id, serial_number, make, model, owner_org_id')
    .order('created_at', { ascending: false })
    .limit(20);

  if (!allMachines || allMachines.length === 0) {
    console.log('No machines found');
    process.exit(0);
  }

  console.log(`[*] Found ${allMachines.length} total machines, checking for documents...`);

  const machineInventory = [];

  for (const machine of allMachines.slice(0, 10)) {
    const { count: docCount } = await supabase
      .from('machine_documents')
      .select('*', { count: 'exact', head: true })
      .eq('machine_id', machine.id);

    const { count: kbCount } = await supabase
      .from('machine_kb')
      .select('*', { count: 'exact', head: true })
      .eq('machine_id', machine.id);

    if ((docCount || 0) > 0 || (kbCount || 0) > 0) {
      machineInventory.push({
        id: machine.id,
        serial: machine.serial_number,
        make: machine.make,
        model: machine.model,
        org_id: machine.owner_org_id,
        documents: docCount || 0,
        kb_entries: kbCount || 0
      });
    }
  }

  if (machineInventory.length === 0) {
    console.log('No machines with documents found. Using first 3 machines for proof.');
    for (const m of allMachines.slice(0, 3)) {
      machineInventory.push({
        id: m.id,
        serial: m.serial_number,
        make: m.make,
        model: m.model,
        org_id: m.owner_org_id,
        documents: 0,
        kb_entries: 0
      });
    }
  }

  console.log('\n[FLEET SCOPE]');
  machineInventory.slice(0, 5).forEach((m, i) => {
    console.log(`Machine ${i + 1}: ${m.serial} (${m.make} ${m.model})`);
    console.log(`  - ID: ${m.id}`);
    console.log(`  - Documents: ${m.documents}, KB Entries: ${m.kb_entries}`);
  });

  console.log(`\n[SELECTED LOT SIZE]: ${Math.min(5, machineInventory.length)} machines`);

  const result = {
    lot_size: Math.min(5, machineInventory.length),
    machines: machineInventory.slice(0, 5)
  };

  fs.mkdirSync('artifacts/fleet-proof', { recursive: true });
  fs.writeFileSync('artifacts/fleet-proof/fleet-inventory.json', JSON.stringify(result, null, 2));

  console.log('\n✓ Inventory saved to artifacts/fleet-proof/fleet-inventory.json');
}

main().catch(e => {
  console.error('Error:', e.message);
  process.exit(1);
});
