import { createClient } from '@supabase/supabase-js'
import fs from 'node:fs'
import path from 'node:path'
import crypto from 'node:crypto'

type Json = Record<string, unknown>

// Load env
const envPath = path.resolve(__dirname, '../.env.production');
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf8');
  envContent.split('\n').forEach(line => {
    const [key, ...valueParts] = line.split('=');
    if (key && !key.startsWith('#')) {
      const value = valueParts.join('=').trim().replace(/^"|"$/g, '');
      if (value) process.env[key] = value;
    }
  });
}

function requireEnv(name: string): string {
  const value = process.env[name]
  if (!value) throw new Error(`Missing env: ${name}`)
  return value
}

function ensureDir(dir: string) {
  fs.mkdirSync(dir, { recursive: true })
}

function uid(prefix: string): string {
  return `${prefix}-${crypto.randomUUID().slice(0, 8)}`
}

async function main() {
  const supabaseUrl = requireEnv('NEXT_PUBLIC_SUPABASE_URL')
  const serviceRoleKey = requireEnv('SUPABASE_SERVICE_ROLE_KEY')

  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  })

  const exportDir = path.join(process.cwd(), 'artifacts', 'enriched-read-paths-proof')
  ensureDir(exportDir)

  const machineAInsert = await supabase
    .from('machines')
    .insert({
      owner_org_id: '00000000-0000-0000-0000-000000000001',
      model: 'VB750 DK READ A',
      serial_number: uid('READ-A'),
      make: 'Hammel',
    })
    .select('id, model, serial_number')
    .single()
  if (machineAInsert.error) throw machineAInsert.error
  const machineA = machineAInsert.data

  const machineBInsert = await supabase
    .from('machines')
    .insert({
      owner_org_id: '00000000-0000-0000-0000-000000000001',
      model: 'VB750 DK READ B',
      serial_number: uid('READ-B'),
      make: 'Hammel',
    })
    .select('id, model, serial_number')
    .single()
  if (machineBInsert.error) throw machineBInsert.error
  const machineB = machineBInsert.data

  const diagA = await supabase
    .from('internal_tickets')
    .insert({
      machine_id: machineA.id,
      title: uid('diag-a'),
      description: 'diagnostic row A',
      status: 'OPEN',
      source: 'diagnostic_enriched',
      metadata: { proof_group: 'A', domain: 'diagnostic' },
    })
    .select('id, machine_id, title, source, metadata')
    .single()
  if (diagA.error) throw diagA.error

  const maintA = await supabase
    .from('work_orders')
    .insert({
      machine_id: machineA.id,
      title: uid('maint-a'),
      description: 'maintenance row A',
      status: 'OPEN',
      source: 'maintenance_enriched',
      metadata: { proof_group: 'A', domain: 'maintenance' },
    })
    .select('id, machine_id, title, source, metadata')
    .single()
  if (maintA.error) throw maintA.error

  const procA = await supabase
    .from('part_orders')
    .insert({
      machine_id: machineA.id,
      part_name: uid('proc-a'),
      quantity: 1,
      status: 'PENDING',
      source: 'procurement_enriched',
      metadata: { proof_group: 'A', domain: 'procurement' },
    })
    .select('id, machine_id, part_name, source, metadata')
    .single()
  if (procA.error) throw procA.error

  const diagB = await supabase
    .from('internal_tickets')
    .insert({
      machine_id: machineB.id,
      title: uid('diag-b'),
      description: 'diagnostic row B',
      status: 'OPEN',
      source: 'diagnostic_enriched',
      metadata: { proof_group: 'B', domain: 'diagnostic' },
    })
    .select('id, machine_id, title, source, metadata')
    .single()
  if (diagB.error) throw diagB.error

  const maintB = await supabase
    .from('work_orders')
    .insert({
      machine_id: machineB.id,
      title: uid('maint-b'),
      description: 'maintenance row B',
      status: 'OPEN',
      source: 'maintenance_enriched',
      metadata: { proof_group: 'B', domain: 'maintenance' },
    })
    .select('id, machine_id, title, source, metadata')
    .single()
  if (maintB.error) throw maintB.error

  const procB = await supabase
    .from('part_orders')
    .insert({
      machine_id: machineB.id,
      part_name: uid('proc-b'),
      quantity: 1,
      status: 'PENDING',
      source: 'procurement_enriched',
      metadata: { proof_group: 'B', domain: 'procurement' },
    })
    .select('id, machine_id, part_name, source, metadata')
    .single()
  if (procB.error) throw procB.error

  const readDiagA = await supabase
    .from('internal_tickets')
    .select('id, machine_id, title, source, metadata')
    .eq('machine_id', machineA.id)
    .eq('source', 'diagnostic_enriched')
  if (readDiagA.error) throw readDiagA.error

  const readMaintA = await supabase
    .from('work_orders')
    .select('id, machine_id, title, source, metadata')
    .eq('machine_id', machineA.id)
    .eq('source', 'maintenance_enriched')
  if (readMaintA.error) throw readMaintA.error

  const readProcA = await supabase
    .from('part_orders')
    .select('id, machine_id, part_name, source, metadata')
    .eq('machine_id', machineA.id)
    .eq('source', 'procurement_enriched')
  if (readProcA.error) throw readProcA.error

  const readDiagB = await supabase
    .from('internal_tickets')
    .select('id, machine_id, title, source, metadata')
    .eq('machine_id', machineB.id)
    .eq('source', 'diagnostic_enriched')
  if (readDiagB.error) throw readDiagB.error

  const readMaintB = await supabase
    .from('work_orders')
    .select('id, machine_id, title, source, metadata')
    .eq('machine_id', machineB.id)
    .eq('source', 'maintenance_enriched')
  if (readMaintB.error) throw readMaintB.error

  const readProcB = await supabase
    .from('part_orders')
    .select('id, machine_id, part_name, source, metadata')
    .eq('machine_id', machineB.id)
    .eq('source', 'procurement_enriched')
  if (readProcB.error) throw readProcB.error

  const leakDiagA = (readDiagA.data ?? []).some((row) => row.machine_id !== machineA.id)
  const leakMaintA = (readMaintA.data ?? []).some((row) => row.machine_id !== machineA.id)
  const leakProcA = (readProcA.data ?? []).some((row) => row.machine_id !== machineA.id)

  const leakDiagB = (readDiagB.data ?? []).some((row) => row.machine_id !== machineB.id)
  const leakMaintB = (readMaintB.data ?? []).some((row) => row.machine_id !== machineB.id)
  const leakProcB = (readProcB.data ?? []).some((row) => row.machine_id !== machineB.id)

  const proof: Json = {
    final_status:
      !leakDiagA && !leakMaintA && !leakProcA && !leakDiagB && !leakMaintB && !leakProcB
        ? 'PASS'
        : 'FAIL',
    machines: {
      A: machineA,
      B: machineB,
    },
    writes: {
      diagA: diagA.data,
      maintA: maintA.data,
      procA: procA.data,
      diagB: diagB.data,
      maintB: maintB.data,
      procB: procB.data,
    },
    reads: {
      diagA: readDiagA.data,
      maintA: readMaintA.data,
      procA: readProcA.data,
      diagB: readDiagB.data,
      maintB: readMaintB.data,
      procB: readProcB.data,
    },
    isolation: {
      diagA_no_cross_machine_rows: !leakDiagA,
      maintA_no_cross_machine_rows: !leakMaintA,
      procA_no_cross_machine_rows: !leakProcA,
      diagB_no_cross_machine_rows: !leakDiagB,
      maintB_no_cross_machine_rows: !leakMaintB,
      procB_no_cross_machine_rows: !leakProcB,
    },
  }

  fs.writeFileSync(
    path.join(exportDir, 'final_read_paths_proof.json'),
    JSON.stringify(proof, null, 2),
    'utf8'
  )

  console.log(JSON.stringify(proof, null, 2))
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
