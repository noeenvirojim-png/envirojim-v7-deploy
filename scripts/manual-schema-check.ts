import { Client } from 'pg';
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';

dotenv.config({ path: path.join(process.cwd(), '.env.local') });

/**
 * MANUAL SCHEMA DRIFT CHECK
 * 
 * Queries information_schema directly to bypass Supabase CLI / Docker issues.
 */

async function checkDrift() {
    const client = new Client({
        connectionString: process.env.POSTGRES_URL,
        ssl: { rejectUnauthorized: false }
    });
    // Secondary bypass for some pg versions
    process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

    try {
        await client.connect();
        console.log('Connected to DB for manual schema check.');

        const tablesToCheck = ['machines', 'users', 'organizations', 'documents'];
        let driftCount = 0;

        for (const table of tablesToCheck) {
            console.log(`Checking table: ${table}...`);
            const res = await client.query(`
                SELECT column_name, is_nullable, data_type 
                FROM information_schema.columns 
                WHERE table_name = $1 
                AND table_schema = 'public'
                ORDER BY column_name
            `, [table]);

            if (res.rows.length === 0) {
                console.error(`❌ Table ${table} is missing in DB!`);
                driftCount++;
                continue;
            }

            // Simple verification: check if critical columns from V6 exist
            // This is a subset of the full schema.ts but covers the "Locked" invariants.
            const criticalColumns: Record<string, string[]> = {
                'machines': ['organization_id', 'serial_number', 'id'],
                'users': ['role', 'organization_id', 'id'],
                'organizations': ['type', 'parent_id', 'id']
            };

            const cols = res.rows.map(r => r.column_name);
            for (const crit of (criticalColumns[table] || [])) {
                if (!cols.includes(crit)) {
                    console.error(`❌ Missing critical column '${crit}' in table '${table}'`);
                    driftCount++;
                }
            }
        }

        if (driftCount > 0) {
            console.error(`\n🛑 MANUAL SCHEMA DRIFT DETECTED: Found ${driftCount} issues.`);
            process.exit(1);
        }

        console.log('✅ Manual schema validation passed (Critical Invariants).');
        process.exit(0);

    } catch (err: any) {
        console.error('Manual schema check failed:', err.message);
        process.exit(1);
    } finally {
        await client.end();
    }
}

checkDrift();
