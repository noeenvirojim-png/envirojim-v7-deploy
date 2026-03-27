import fs from 'fs';
import pg from 'pg';
import { v4 as uuid } from 'uuid';
import path from 'path';

// Load env
const envPath = path.resolve('.env.production');
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

const { Client } = pg;
const databaseUrl = process.env.POSTGRES_URL;

async function run() {
  // Disable SSL verification for self-signed certs
  process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

  const client = new Client({
    connectionString: databaseUrl,
    ssl: true
  });

  try {
    await client.connect();
    console.log('[0] Connected to database');

    // Create test orgs and data
    const orgA = uuid();
    const orgB = uuid();
    const machineA = uuid();
    const machineB = uuid();
    const diagA = uuid();
    const diagB = uuid();
    const maintA = uuid();
    const maintB = uuid();
    const procA = uuid();
    const procB = uuid();

    console.log(`[1] Creating test data: Org A=${orgA}, Org B=${orgB}`);

    // Create orgs
    await client.query(
      'INSERT INTO public.organizations(id, name, type) VALUES($1, $2, $3) ON CONFLICT(id) DO NOTHING',
      [orgA, `TEST-ORG-A-${Date.now()}`, 'SUB_DEALER']
    );
    await client.query(
      'INSERT INTO public.organizations(id, name, type) VALUES($1, $2, $3) ON CONFLICT(id) DO NOTHING',
      [orgB, `TEST-ORG-B-${Date.now()}`, 'SERVICE_PROVIDER']
    );

    // Create machines
    await client.query(
      'INSERT INTO public.machines(id, owner_org_id, serial_number, make, model, year) VALUES($1, $2, $3, $4, $5, $6) ON CONFLICT(id) DO NOTHING',
      [machineA, orgA, `SN-A-${Date.now()}`, 'Hammel', 'VB750', 2026]
    );
    await client.query(
      'INSERT INTO public.machines(id, owner_org_id, serial_number, make, model, year) VALUES($1, $2, $3, $4, $5, $6) ON CONFLICT(id) DO NOTHING',
      [machineB, orgB, `SN-B-${Date.now()}`, 'Hammel', 'VB950', 2026]
    );

    // Create enriched data
    await client.query(
      'INSERT INTO public.internal_tickets(id, machine_id, title, source) VALUES($1, $2, $3, $4) ON CONFLICT(id) DO NOTHING',
      [diagA, machineA, 'Diag A', 'diagnostic_enriched']
    );
    await client.query(
      'INSERT INTO public.internal_tickets(id, machine_id, title, source) VALUES($1, $2, $3, $4) ON CONFLICT(id) DO NOTHING',
      [diagB, machineB, 'Diag B', 'diagnostic_enriched']
    );
    await client.query(
      'INSERT INTO public.work_orders(id, machine_id, title, source) VALUES($1, $2, $3, $4) ON CONFLICT(id) DO NOTHING',
      [maintA, machineA, 'Maint A', 'maintenance_enriched']
    );
    await client.query(
      'INSERT INTO public.work_orders(id, machine_id, title, source) VALUES($1, $2, $3, $4) ON CONFLICT(id) DO NOTHING',
      [maintB, machineB, 'Maint B', 'maintenance_enriched']
    );
    await client.query(
      'INSERT INTO public.part_orders(id, machine_id, part_name, source) VALUES($1, $2, $3, $4) ON CONFLICT(id) DO NOTHING',
      [procA, machineA, 'Part A', 'procurement_enriched']
    );
    await client.query(
      'INSERT INTO public.part_orders(id, machine_id, part_name, source) VALUES($1, $2, $3, $4) ON CONFLICT(id) DO NOTHING',
      [procB, machineB, 'Part B', 'procurement_enriched']
    );

    console.log('[2] Creating non-privileged test role');

    // Create a non-superuser role (anon-like role that doesn't bypass RLS)
    const testRole = 'rls_test_user_' + Date.now();

    await client.query(`CREATE ROLE ${testRole} NOINHERIT`);
    await client.query(`GRANT USAGE ON SCHEMA public TO ${testRole}`);
    await client.query(`GRANT SELECT, INSERT ON public.internal_tickets TO ${testRole}`);
    await client.query(`GRANT SELECT, INSERT ON public.work_orders TO ${testRole}`);
    await client.query(`GRANT SELECT, INSERT ON public.part_orders TO ${testRole}`);
    await client.query(`GRANT SELECT ON public.machines TO ${testRole}`);
    await client.query(`GRANT SELECT ON public.organizations TO ${testRole}`);

    console.log('[3] Testing RLS with non-privileged role');

    // Helper to switch role and set context
    async function testOrgContext(orgId, otherMachineId, roleToTest) {
      await client.query(`SET ROLE ${roleToTest}`);
      await client.query(`SELECT set_config('app.current_org_id', $1::text, false)`, [orgId]);

      const diagResult = await client.query(`SELECT id, machine_id FROM public.internal_tickets`);
      const maintResult = await client.query(`SELECT id, machine_id FROM public.work_orders`);
      const procResult = await client.query(`SELECT id, machine_id FROM public.part_orders`);

      return {
        diag: {
          rows: diagResult.rows,
          seesOther: diagResult.rows.some(r => r.machine_id === otherMachineId)
        },
        maint: {
          rows: maintResult.rows,
          seesOther: maintResult.rows.some(r => r.machine_id === otherMachineId)
        },
        proc: {
          rows: procResult.rows,
          seesOther: procResult.rows.some(r => r.machine_id === otherMachineId)
        }
      };
    }

    // Test as Org A
    console.log(`[3a] Testing as ${testRole} with app.current_org_id = Org A`);
    const testA = await testOrgContext(orgA, machineB, testRole);
    console.log(`  - Rows visible to Org A: ${testA.diag.rows.length} (should be 1)`);
    console.log(`  - Can see Org B's diag: ${testA.diag.seesOther} (should be false)`);
    console.log(`  - Maint rows visible to Org A: ${testA.maint.rows.length} (should be 1)`);
    console.log(`  - Can see Org B's maint: ${testA.maint.seesOther} (should be false)`);
    console.log(`  - Proc rows visible to Org A: ${testA.proc.rows.length} (should be 1)`);
    console.log(`  - Can see Org B's proc: ${testA.proc.seesOther} (should be false)`);

    const diagASeesB = testA.diag.seesOther;
    const maintASeesB = testA.maint.seesOther;
    const procASeesB = testA.proc.seesOther;
    const diagARows = testA.diag.rows;
    const maintARows = testA.maint.rows;
    const procARows = testA.proc.rows;

    // Test as Org B
    console.log(`[3b] Testing as ${testRole} with app.current_org_id = Org B`);
    const testB = await testOrgContext(orgB, machineA, testRole);
    console.log(`  - Rows visible to Org B: ${testB.diag.rows.length} (should be 1)`);
    console.log(`  - Can see Org A's diag: ${testB.diag.seesOther} (should be false)`);
    console.log(`  - Maint rows visible to Org B: ${testB.maint.rows.length} (should be 1)`);
    console.log(`  - Can see Org A's maint: ${testB.maint.seesOther} (should be false)`);
    console.log(`  - Proc rows visible to Org B: ${testB.proc.rows.length} (should be 1)`);
    console.log(`  - Can see Org A's proc: ${testB.proc.seesOther} (should be false)`);

    const diagBSeesA = testB.diag.seesOther;
    const maintBSeesA = testB.maint.seesOther;
    const procBSeesA = testB.proc.seesOther;
    const diagBRows = testB.diag.rows;
    const maintBRows = testB.maint.rows;
    const procBRows = testB.proc.rows;

    // Determine PASS/FAIL
    const diagPASS = diagARows.length === 1 && !diagASeesB && diagBRows.length === 1 && !diagBSeesA;
    const maintPASS = maintARows.length === 1 && !maintASeesB && maintBRows.length === 1 && !maintBSeesA;
    const procPASS = procARows.length === 1 && !procASeesB && procBRows.length === 1 && !procBSeesA;
    const crossOrgBlocked = !diagASeesB && !maintASeesB && !procASeesB && !diagBSeesA && !maintBSeesA && !procBSeesA;

    const result = {
      changed: ['scripts/test-rls-non-privileged.mjs'],
      non_privileged_harness_truth: {
        test_method_used: `PostgreSQL non-superuser role '${testRole}' + SET ROLE + set_config('app.current_org_id')`,
        bypass_rls_possible_with_this_method: 'NO',
        org_context_injection_method: "select set_config('app.current_org_id', org_uuid::text, false)",
        org_a_context_value: orgA,
        org_b_context_value: orgB
      },
      result_native_rls_proof: {
        diagnostic_native_rls_verified: diagPASS ? 'PASS' : 'FAIL',
        maintenance_native_rls_verified: maintPASS ? 'PASS' : 'FAIL',
        procurement_native_rls_verified: procPASS ? 'PASS' : 'FAIL',
        cross_org_direct_db_read_blocked: crossOrgBlocked ? 'YES' : 'NO',
        final_status: diagPASS && maintPASS && procPASS && crossOrgBlocked ? 'PASS' : 'FAIL'
      },
      db_proof: {
        org_a_can_read_org_b_diagnostic_rows: diagASeesB,
        org_a_can_read_org_b_maintenance_rows: maintASeesB,
        org_a_can_read_org_b_procurement_rows: procASeesB,
        org_a_diag_rows_visible: diagARows.length,
        org_a_maint_rows_visible: maintARows.length,
        org_a_proc_rows_visible: procARows.length,
        org_b_diag_rows_visible: diagBRows.length,
        org_b_maint_rows_visible: maintBRows.length,
        org_b_proc_rows_visible: procBRows.length
      }
    };

    const outDir = 'artifacts/native-rls-proof';
    if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });
    fs.writeFileSync(`${outDir}/native_rls_proof_non_privileged.json`, JSON.stringify(result, null, 2));

    console.log('');
    console.log('## CHANGED');
    console.log('- scripts/test-rls-non-privileged.mjs');
    console.log('');
    console.log('## NON_PRIVILEGED_HARNESS_TRUTH');
    console.log(`- test_method_used: PostgreSQL non-superuser role + SET ROLE + set_config`);
    console.log(`- bypass_rls_possible_with_this_method: NO`);
    console.log(`- org_context_injection_method: select set_config('app.current_org_id', org_uuid::text, false)`);
    console.log(`- org_a_context_value: ${orgA}`);
    console.log(`- org_b_context_value: ${orgB}`);
    console.log('');
    console.log('## RESULT_NATIVE_RLS_PROOF');
    console.log(`- diagnostic_native_rls_verified: ${result.result_native_rls_proof.diagnostic_native_rls_verified}`);
    console.log(`- maintenance_native_rls_verified: ${result.result_native_rls_proof.maintenance_native_rls_verified}`);
    console.log(`- procurement_native_rls_verified: ${result.result_native_rls_proof.procurement_native_rls_verified}`);
    console.log(`- cross_org_direct_db_read_blocked: ${result.result_native_rls_proof.cross_org_direct_db_read_blocked}`);
    console.log(`- final_status: ${result.result_native_rls_proof.final_status}`);
    console.log('');
    console.log('## DB_PROOF');
    console.log(`- org_a_can_read_org_b_diagnostic_rows: ${result.db_proof.org_a_can_read_org_b_diagnostic_rows}`);
    console.log(`- org_a_can_read_org_b_maintenance_rows: ${result.db_proof.org_a_can_read_org_b_maintenance_rows}`);
    console.log(`- org_a_can_read_org_b_procurement_rows: ${result.db_proof.org_a_can_read_org_b_procurement_rows}`);
    console.log('');
    if (result.result_native_rls_proof.final_status === 'PASS') {
      console.log('## BLOCKERS');
      console.log('- NONE');
    } else {
      console.log('## BLOCKERS');
      console.log(`- RLS not blocking correctly: Diag=${result.result_native_rls_proof.diagnostic_native_rls_verified}, Maint=${result.result_native_rls_proof.maintenance_native_rls_verified}, Proc=${result.result_native_rls_proof.procurement_native_rls_verified}`);
    }

  } finally {
    await client.end();
  }
}

run().catch(e => {
  console.error('## BLOCKERS');
  console.error(`- ${e.message}`);
  console.error(e.stack);
  process.exit(1);
});
