const fs = require('fs');
const { Client } = require('pg');
const path = require('path');
require('dotenv').config({ path: path.resolve(process.cwd(), '.env.local') });

const connectionString = process.env.POSTGRES_URL || 'postgresql://postgres:postgres@127.0.0.1:54322/postgres';

async function runSeed() {
    const client = new Client({ connectionString });
    try {
        await client.connect();
        console.log('--- EXECUTING SEED_AUTH.SQL ---');
        const sqlPath = path.resolve(process.cwd(), '../supabase/seed_auth.sql');
        const sql = fs.readFileSync(sqlPath, 'utf8');
        
        await client.query(sql);
        console.log('✅ SEED COMPLETED SUCCESSFULLY.');

    } catch (err) {
        console.error('❌ SEED FAILED:', err.message);
    } finally {
        await client.end();
    }
}

runSeed();
