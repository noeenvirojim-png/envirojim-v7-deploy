const { Client } = require('pg');
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: path.join(process.cwd(), '.env.local') });

async function applyFix() {
    console.log('🔧 Applying Production Schema Fixes...');

    let connectionString = process.env.POSTGRES_URL;
    if (connectionString && connectionString.includes('sslmode=require')) {
        connectionString = connectionString.replace('?sslmode=require', '');
    }

    const client = new Client({
        connectionString,
        ssl: { rejectUnauthorized: false }
    });

    try {
        await client.connect();

        const sqlPath = path.join(process.cwd(), 'db', 'fix_prod_drift.sql');
        const sql = fs.readFileSync(sqlPath, 'utf8');

        console.log('Executing SQL...');
        await client.query(sql);
        console.log('✅ Fixes applied successfully.');

    } catch (err) {
        console.error('❌ Failed to apply fixes:', err.message);
        process.exit(1);
    } finally {
        await client.end();
    }
}

applyFix();
