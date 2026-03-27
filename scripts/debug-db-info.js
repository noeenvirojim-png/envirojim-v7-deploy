const { Client } = require('pg');
const dotenv = require('dotenv');
const fs = require('fs');
const path = require('path');

process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

async function debugDb() {
    if (fs.existsSync('.env.local')) {
        dotenv.config({ path: '.env.local' });
    }
    const connectionString = process.env.POSTGRES_URL || process.env.DATABASE_URL;
    const client = new Client({ connectionString, ssl: { rejectUnauthorized: false } });

    try {
        await client.connect();
        console.log('✅ Connected.');

        console.log('\n--- User Roles Enum ---');
        const roles = await client.query("SELECT enumlabel FROM pg_enum JOIN pg_type ON pg_enum.enumtypid = pg_type.oid WHERE pg_type.typname = 'user_role'");
        console.log(roles.rows.map(r => r.enumlabel));

        console.log('\n--- Function Definitions ---');
        const definitions = await client.query("SELECT routine_name, routine_definition FROM information_schema.routines WHERE routine_schema = 'public' AND routine_name IN ('is_admin', 'get_auth_org_hierarchy', 'create_machine_with_document')");
        definitions.rows.forEach(r => {
            console.log(`\nFUNCTION: ${r.routine_name}\n${r.routine_definition}`);
        });

    } catch (err) {
        console.error('❌ Error:', err);
    } finally {
        await client.end();
    }
}

debugDb();
