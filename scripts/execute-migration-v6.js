
const { Client } = require('pg');
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: '../.env.local' });

async function runMigration() {
    console.log('--- EXECUTING V6 REPAIR MIGRATION ---');
    
    const client = new Client({
        connectionString: process.env.POSTGRES_URL.split('?')[0],
        ssl: { rejectUnauthorized: false }
    });

    try {
        await client.connect();
        
        const migrationPath = path.join(__dirname, '../supabase/migrations/20260312000001_schema_unification.sql');
        const sql = fs.readFileSync(migrationPath, 'utf8');
        
        console.log('Applying SQL...');
        await client.query(sql);
        console.log('✅ Migration applied successfully.');
        
    } catch (err) {
        console.error('❌ Migration failed:', err.message);
        process.exit(1);
    } finally {
        await client.end();
    }
}

runMigration();
