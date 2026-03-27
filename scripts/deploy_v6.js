const { Client } = require('pg');
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: '.env.local' }); // Try .env.local first

const ARTIFACTS_DIR = 'C:\\Users\\noeev\\.gemini\\antigravity\\brain\\e0ea66e5-c12a-4870-99c2-81b203dfd746';

const FILES = [
    '001_CORE.sql',
    '002_KNOWLEDGE.sql',
    '003_OPERATIONS.sql'
];

async function deploy() {
    console.log('🔌 Connecting to database...');

    if (!process.env.POSTGRES_URL && !process.env.DATABASE_URL) {
        console.error('❌ Missing POSTGRES_URL or DATABASE_URL in environment');
        process.exit(1);
    }

    const client = new Client({
        connectionString: process.env.POSTGRES_URL || process.env.DATABASE_URL,
        ssl: { rejectUnauthorized: false } // Required for Supabase in many envs
    });

    try {
        await client.connect();
        console.log('✅ Connected.');

        // 1. Transaction Wrapper
        console.log('🔄 Starting Transaction...');
        await client.query('BEGIN');

        // 2. Execute Files
        for (const file of FILES) {
            const filePath = path.join(ARTIFACTS_DIR, file);
            console.log(`📄 Reading ${file}...`);
            const sql = fs.readFileSync(filePath, 'utf8');

            console.log(`🚀 Executing ${file}...`);
            await client.query(sql);
            console.log(`✅ ${file} applied successfully.`);
        }

        // 3. Commit
        await client.query('COMMIT');
        console.log('🎉 MIGRATION SUCCESSFUL! Transaction committed.');

    } catch (err) {
        console.error('❌ MIGRATION FAILED. Rolling back...');
        await client.query('ROLLBACK');
        console.error(err);
        process.exit(1);
    } finally {
        await client.end();
    }
}

deploy();
