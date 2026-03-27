require('dotenv').config({ path: '.env.local' });
const { Client } = require('pg');
const fs = require('fs');

process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

const client = new Client({
    connectionString: process.env.POSTGRES_URL,
    ssl: { rejectUnauthorized: false }
});

async function applyRemove() {
    try {
        await client.connect();
        const sql = fs.readFileSync('db/REMOVE_HOOK.sql', 'utf8');
        await client.query(sql);
        console.log('✅ HOOK_REMOVED');
    } catch (e) {
        console.error('❌ REMOVE_FAILED:', e);
    } finally {
        await client.end();
    }
}

applyRemove();
