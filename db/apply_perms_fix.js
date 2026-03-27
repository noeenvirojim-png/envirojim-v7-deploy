require('dotenv').config({ path: '.env.local' });
const { Client } = require('pg');
const fs = require('fs');

process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

const client = new Client({
    connectionString: process.env.POSTGRES_URL,
    ssl: { rejectUnauthorized: false }
});

async function applyFix() {
    try {
        await client.connect();
        const sql = fs.readFileSync('db/FIX_ALL_AUTH_PERMS.sql', 'utf8');
        await client.query(sql);
        console.log('✅ PERMISSIONS_FIXED');
    } catch (e) {
        console.error('❌ FIX_FAILED:', e);
    } finally {
        await client.end();
    }
}

applyFix();
