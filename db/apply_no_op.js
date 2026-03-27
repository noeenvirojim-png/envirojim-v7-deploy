require('dotenv').config({ path: '.env.local' });
const { Client } = require('pg');
const fs = require('fs');

process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

const client = new Client({
    connectionString: process.env.POSTGRES_URL,
    ssl: { rejectUnauthorized: false }
});

async function applyNoOp() {
    try {
        await client.connect();
        const sql = fs.readFileSync('db/NO_OP_HOOK.sql', 'utf8');
        await client.query(sql);
        console.log('✅ NO_OP_HOOK_APPLIED');
    } catch (e) {
        console.error('❌ APPLY_FAILED:', e);
    } finally {
        await client.end();
    }
}

applyNoOp();
