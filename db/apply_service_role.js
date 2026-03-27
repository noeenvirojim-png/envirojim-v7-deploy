require('dotenv').config({ path: '.env.local' });
const { Client } = require('pg');
const fs = require('fs');

process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

const client = new Client({
    connectionString: process.env.POSTGRES_URL,
    ssl: { rejectUnauthorized: false }
});

async function applyServiceRole() {
    try {
        await client.connect();
        const sql = fs.readFileSync('db/POLICY_SERVICE_ROLE.sql', 'utf8');
        await client.query(sql);
        console.log('✅ SERVICE_POLICY_APPLIED');
    } catch (e) {
        console.error('❌ POLICY_FAILED:', e);
    } finally {
        await client.end();
    }
}

applyServiceRole();
