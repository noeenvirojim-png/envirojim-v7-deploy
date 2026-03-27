require('dotenv').config({ path: '.env.local' });
const { Client } = require('pg');
const fs = require('fs');

process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

const client = new Client({
    connectionString: process.env.POSTGRES_URL,
    ssl: { rejectUnauthorized: false }
});

async function checkRLS() {
    try {
        await client.connect();
        const sql = fs.readFileSync('db/CHECK_RLS_STATUS.sql', 'utf8');
        const { rows: tableRows } = await client.query("SELECT tablename, rowsecurity FROM pg_tables WHERE tablename = 'users'");
        console.log('--- TABLE RLS ---');
        console.table(tableRows);

        const { rows: roleRows } = await client.query("SELECT rolname, rolbypassrls FROM pg_roles WHERE rolname = 'supabase_auth_admin'");
        console.log('--- ROLE BYPASS ---');
        console.table(roleRows);
    } catch (e) {
        console.error('❌ CHECK_FAILED:', e);
    } finally {
        await client.end();
    }
}

checkRLS();
