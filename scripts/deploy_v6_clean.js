
const { Client } = require('pg');
const fs = require('fs');
require('dotenv').config({ path: '.env.local' });
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

const client = new Client({
    connectionString: process.env.POSTGRES_URL || process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});

async function deploy() {
    try {
        console.log('🔌 Connecting...');
        await client.connect();

        console.log('☢️  CLEAN SLATE: Executing master schema...');
        const schema = fs.readFileSync('db/schema.sql', 'utf8');
        await client.query(schema);

        console.log('🛠️  Adding helpers...');
        const helpers = fs.readFileSync('db/functions.sql', 'utf8');
        await client.query(helpers);

        console.log('🔒 Adding RPCs...');
        const rpcs = fs.readFileSync('db/rpc-functions.sql', 'utf8');
        await client.query(rpcs);

        console.log('🌱 SEEDING TEST DATA...');
        const rootId = '00000000-0000-0000-0000-000000000001';
        await client.query(`INSERT INTO public.organizations (id, name, type) VALUES ('${rootId}', 'EnviroJim HQ', 'ENVIROJIM') ON CONFLICT DO NOTHING`);
        await client.query(`INSERT INTO public.users (id, organization_id, role, email, full_name) VALUES ('${rootId}', '${rootId}', 'SUPER_ADMIN', 'admin@envirojim.com', 'Super Admin') ON CONFLICT DO NOTHING`);

        console.log('📦 Seeding parts for index test...');
        for (let i = 0; i < 10; i++) {
            await client.query(`INSERT INTO public.parts_catalog (part_number, name, description) VALUES ('TEST-${i}', 'Hydraulic Pump ${i}', 'Heavy duty pump for excavator')`);
        }

        console.log('🎉 DEPLOYMENT SUCCESSFUL');
    } catch (err) {
        console.error('❌ FAILED:', err.message);
        process.exit(1);
    } finally {
        await client.end();
    }
}

deploy();
