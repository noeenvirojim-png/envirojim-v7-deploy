require('dotenv').config({ path: '.env.local' });
const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');
const dns = require('dns');
const util = require('util');

const connectionString = process.env.POSTGRES_URL || process.env.DATABASE_URL;

if (!connectionString) {
    console.error('❌ Missing POSTGRES_URL or DATABASE_URL in .env.local');
    process.exit(1);
}

const resolve6 = util.promisify(dns.resolve6);

// Function to get connection config
async function getConnectionConfig() {
    const originalUrl = new URL(connectionString);
    const hostParts = originalUrl.hostname.split('.');

    // Extract Project ID (e.g., db.mdbyrkxraplifqcrpqol.supabase.co -> mdbyrkxraplifqcrpqol)
    const projectId = hostParts[1];

    if (!projectId || projectId.length < 10) {
        console.warn('⚠️ Could not extract project ID from host. Using original string.');
        return {
            connectionString,
            ssl: { rejectUnauthorized: false }
        };
    }

    // Construct Pooler URL
    // Format: postgres://postgres.[PROJECT-ID]:[PASSWORD]@aws-0-us-east-1.pooler.supabase.com:6543/postgres?pgbouncer=true
    const password = encodeURIComponent(originalUrl.password);
    const poolerHost = 'aws-0-us-east-1.pooler.supabase.com';
    const poolerPort = 5432;
    const poolerUser = encodeURIComponent(`postgres.${projectId}`);

    const poolerUrl = `postgres://${poolerUser}:${password}@${poolerHost}:${poolerPort}/postgres`;

    console.log(`✅ Constructed Pooler URL: postgres://${poolerUser}:[HIDDEN]@${poolerHost}:${poolerPort}/postgres?pgbouncer=true`);

    return {
        connectionString: poolerUrl,
        ssl: { rejectUnauthorized: false }
    };
}

async function runReset() {
    const config = await getConnectionConfig();
    const pool = new Pool(config);

    const client = await pool.connect();
    try {
        console.log('🔌 Connected to database...');

        // Read SQL files
        const nuclearSql = fs.readFileSync(path.join(__dirname, '../db/NUCLEAR_RESET.sql'), 'utf8');
        const resetSeedSql = fs.readFileSync(path.join(__dirname, '../db/RESET_AND_SEED.sql'), 'utf8');

        console.log('🧪 Testing simple query...');
        const res = await client.query('SELECT now()');
        console.log('✅ Query success:', res.rows[0]);

        /*
        console.log('☢️  Executing NUCLEAR_RESET.sql...');
        await client.query(nuclearSql);
        console.log('✅ Nuclear reset complete.');

        console.log('🌱 Executing RESET_AND_SEED.sql...');
        await client.query(resetSeedSql);
        console.log('✅ Reset and Seed complete.');
        */

        console.log('🎉 Database connection verified!');
    } catch (err) {
        console.error('❌ Error during reset:', err);
        process.exit(1);
    } finally {
        client.release();
        await pool.end();
    }
}

runReset();
