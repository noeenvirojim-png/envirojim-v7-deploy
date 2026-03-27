
const { Client } = require('pg');
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: '.env.local' });
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

const client = new Client({
    connectionString: process.env.POSTGRES_URL || process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});

async function runGranular(filePath) {
    console.log(`📄 Processing ${filePath}...`);
    const sql = fs.readFileSync(filePath, 'utf8');
    // Simple split by semicolon (not perfect for complex functions with semicolons, but good enough for ALTERs)
    // For functions, we might need a more complex split.
    // Let's use a smarter one: split by ; followed by newline or end of line.
    const statements = sql.split(/;\s*$/m).filter(s => s.trim().length > 0);

    for (let stmt of statements) {
        try {
            const query = stmt.trim() + ';';
            if (query.length < 10) continue;
            console.log(`🚀 Executing: ${query.substring(0, 50).replace(/\n/g, ' ')}...`);
            await client.query(query);
            console.log('✅ Success.');
        } catch (e) {
            console.error(`❌ FAILED at statement: ${stmt.substring(0, 100)}`);
            console.error(`ERROR: ${e.message}`);
            // throw e; // Keep going for other alterations if possible? No, stop on error.
            process.exit(1);
        }
    }
}

async function main() {
    await client.connect();
    try {
        await runGranular('db/migrations/01_hierarchy_soft_delete.sql');
        await runGranular('db/migrations/02_audit_logs.sql');
        await runGranular('db/migrations/03_operational_jobs.sql');
        await runGranular('db/migrations/04_performance_indexes.sql');

        // Functions and RPCs usually contain semicolons inside their bodies, so we'll run them as a whole block.
        const funcs = fs.readFileSync('db/functions.sql', 'utf8');
        console.log('📄 Executing functions.sql...');
        await client.query(funcs);

        const rpcs = fs.readFileSync('db/rpc-functions.sql', 'utf8');
        console.log('📄 Executing rpc-functions.sql...');
        await client.query(rpcs);

        console.log('🎉 DEPLOYMENT COMPLETE');
    } catch (err) {
        console.error('Final Error:', err.message);
    } finally {
        await client.end();
    }
}

main();
