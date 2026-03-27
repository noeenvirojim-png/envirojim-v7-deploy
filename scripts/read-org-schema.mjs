import fs from 'fs'
import { Client } from 'pg'

const envPath = './.env.production';
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

const client = new Client({ connectionString: process.env.POSTGRES_URL, ssl: { rejectUnauthorized: false } });
await client.connect();

// Get columns
const cols = await client.query(`
  SELECT column_name, data_type, is_nullable, column_default
  FROM information_schema.columns
  WHERE table_schema = 'public' AND table_name = 'organizations'
  ORDER BY ordinal_position;
`);

// Get enum values
const enumsSimple = await client.query(`
  SELECT enumlabel FROM pg_enum
  WHERE enumtypid = 'org_type'::regtype
  ORDER BY enumsortorder;
`);

// Get sample
const sample = await client.query(`SELECT * FROM organizations LIMIT 1;`);

await client.end();

console.log('=== COLUMNS ===');
cols.rows.forEach(r => {
  console.log(`${r.column_name}: ${r.data_type} nullable=${r.is_nullable} default=${r.column_default || 'NONE'}`);
});

console.log('\n=== ENUM VALUES (org_type) ===');
enumsSimple.rows.forEach((r, i) => {
  console.log(`  ${i+1}. ${r.enumlabel}`);
});

console.log('\n=== SAMPLE ===');
if (sample.rows[0]) {
  console.log(JSON.stringify(sample.rows[0], null, 2));
}
