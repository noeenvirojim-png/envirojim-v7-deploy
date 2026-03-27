require('dotenv').config({ path: '.env.local' });
const { Client } = require('pg');
const fs = require('fs');

process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

const client = new Client({
    connectionString: process.env.POSTGRES_URL,
    ssl: { rejectUnauthorized: false }
});

async function applyReset() {
    try {
        await client.connect();
        const sql = fs.readFileSync('db/NUCLEAR_AUTH_RESET.sql', 'utf8');
        await client.query(sql);
        console.log('✅ AUTH_WIPED');
    } catch (e) {
        console.error('❌ WIPE_FAILED:', e);
    } finally {
        await client.end();
    }
}

applyReset();
