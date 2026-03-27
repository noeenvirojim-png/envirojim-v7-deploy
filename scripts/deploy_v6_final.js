
const { Client } = require('pg');
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: '.env.local' });
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

const client = new Client({
    connectionString: process.env.POSTGRES_URL || process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});

async function execSQLFile(filePath) {
    console.log(`📄 Reading ${path.basename(filePath)}...`);
    const sql = fs.readFileSync(filePath, 'utf8');
    console.log(`🚀 Executing ${path.basename(filePath)}...`);
    await client.query(sql);
    console.log(`✅ ${path.basename(filePath)} applied.`);
}

async function deploy() {
    try {
        console.log('🔌 Connecting to database...');
        await client.connect();

        const userRes = await client.query('SELECT CURRENT_USER, CURRENT_DATABASE()');
        console.log(`👤 Connected as: ${userRes.rows[0].current_user} to ${userRes.rows[0].current_database}`);

        const existRes = await client.query("SELECT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'users')");
        console.log(`🧐 Does 'public.users' exist? ${existRes.rows[0].exists}`);

        console.log('🔄 Starting V6 DEPLOYMENT (NON-ATOMIC for DEBUG)...');
        // await client.query('BEGIN');

        // 1. Core Schema Updates & Migrations
        await execSQLFile('db/migrations/01_hierarchy_soft_delete.sql');
        await execSQLFile('db/migrations/02_audit_logs.sql');
        await execSQLFile('db/migrations/03_operational_jobs.sql');
        await execSQLFile('db/migrations/04_performance_indexes.sql');

        // 2. Function & RPC Updates (Replace existing with secured versions)
        await execSQLFile('db/functions.sql');
        await execSQLFile('db/rpc-functions.sql');

        // await client.query('COMMIT');
        console.log('🎉 V6 UPGRADE SUCCESSFUL!');

    } catch (err) {
        console.error('❌ DEPLOYMENT FAILED:', err.message);
        // try {
        //    await client.query('ROLLBACK');
        // } catch (e) { console.error('Rollback failed:', e); }
        process.exit(1);
    } finally {
        await client.end();
    }
}

deploy();
