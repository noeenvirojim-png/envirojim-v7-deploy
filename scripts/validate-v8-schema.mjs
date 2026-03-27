import pg from 'pg';

const connectionString = "postgresql://postgres.ptznkpeneqfqhackdeau:%40Enviro2018!@aws-0-us-west-2.pooler.supabase.com:6543/postgres";
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

async function validateSchema() {
    const client = new pg.Client({
        connectionString,
        ssl: { rejectUnauthorized: false }
    });

    try {
        await client.connect();
        console.log('--- SCHEMA VALIDATION ---');

        const tables = ['clients', 'client_oauth_tokens'];
        for (const table of tables) {
            const { rows } = await client.query(`
                SELECT column_name, data_type 
                FROM information_schema.columns 
                WHERE table_name = $1
                ORDER BY ordinal_position
            `, [table]);
            console.log(`\nTable: ${table}`);
            rows.forEach(r => console.log(`  - ${r.column_name} (${r.data_type})`));
        }

    } catch (err) {
        console.error('Validation failed:', err.message);
    } finally {
        await client.end();
    }
}

validateSchema().catch(console.error);
