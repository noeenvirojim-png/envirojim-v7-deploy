require('dotenv').config({ path: '.env.local' });
const { Client } = require('pg');
const fs = require('fs');

process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

const client = new Client({
    connectionString: process.env.POSTGRES_URL,
    ssl: { rejectUnauthorized: false }
});

async function disableRLS() {
    try {
        await client.connect();
        const sql = fs.readFileSync('db/DISABLE_RLS.sql', 'utf8');
        await client.query(sql);
        console.log('⚠️ RLS_DISABLED');
    } catch (e) {
        console.error('❌ DISABLE_FAILED:', e);
    } finally {
        await client.end();
    }
}

disableRLS();
