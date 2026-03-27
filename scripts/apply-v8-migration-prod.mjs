import pg from 'pg';
import fs from 'fs';
import path from 'path';

process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

const connectionString = "postgresql://postgres.ptznkpeneqfqhackdeau:%40Enviro2018!@aws-0-us-west-2.pooler.supabase.com:6543/postgres";

async function applyMigration() {
    const client = new pg.Client({
        connectionString,
        ssl: { rejectUnauthorized: false }
    });

    try {
        console.log('Connecting to production database...');
        await client.connect();
        console.log('✅ Connected.');

        const sqlPath = path.resolve('..', 'db', 'MIGRATION_V8_CLIENT_ONBOARDING.sql');
        console.log(`Reading migration from: ${sqlPath}`);
        const sql = fs.readFileSync(sqlPath, 'utf8');

        console.log('Applying migration...');
        await client.query(sql);
        console.log('✅ Migration applied successfully.');

        console.log('Verifying tables...');
        const { rows } = await client.query(`
            SELECT table_name 
            FROM information_schema.tables 
            WHERE table_schema = 'public' 
            AND table_name IN ('clients', 'client_oauth_tokens')
        `);
        console.log('Tables found:', rows.map(r => r.table_name));

    } catch (err) {
        console.error('❌ Migration failed:', err.message);
        process.exit(1);
    } finally {
        await client.end();
    }
}

applyMigration().catch(console.error);
