require('dotenv').config({ path: '.env.local' });
const { Client } = require('pg');
const fs = require('fs');

process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

const client = new Client({
    connectionString: process.env.POSTGRES_URL,
    ssl: { rejectUnauthorized: false }
});

async function dumpRLS() {
    try {
        await client.connect();
        const sql = fs.readFileSync('db/DUMP_RLS.sql', 'utf8');
        const { rows } = await client.query(sql);
        console.log('--- RLS POLICIES ---');
        console.table(rows);
    } catch (e) {
        console.error('❌ DUMP_FAILED:', e);
    } finally {
        await client.end();
    }
}

dumpRLS();
