const { Client } = require('pg');
require('dotenv').config({ path: '.env.local' });

const PASSWORD = process.env.POSTGRES_URL.split(':')[2].split('@')[0].replace('%40', '@');
const PROJECT_ID = 'mdbyrkxraplifqcrpqol';

const TARGETS = [
    { region: 'us-east-1', host: 'aws-0-us-east-1.pooler.supabase.com' },
    { region: 'ca-central-1', host: 'aws-0-ca-central-1.pooler.supabase.com' },
];

async function testTarget(target, user) {
    console.log(`\n🔍 Testing ${target.region} (${target.host}) as ${user}...`);

    const client = new Client({
        host: target.host,
        port: 6543,
        user: user,
        password: PASSWORD,
        database: 'postgres',
        ssl: { rejectUnauthorized: false },
        connectionTimeoutMillis: 5000,
    });

    try {
        await client.connect();
        console.log(`✅ SUCCESS! Connected to ${target.region} as ${user}`);
        await client.end();
        return true;
    } catch (err) {
        console.log(`❌ Failed: ${err.message}`);
        try { await client.end(); } catch (e) { }
        return false;
    }
}

async function run() {
    // Try 1: User = postgres
    for (const target of TARGETS) {
        if (await testTarget(target, 'postgres')) process.exit(0);
    }

    // Try 2: User = postgres.project (Retry)
    for (const target of TARGETS) {
        if (await testTarget(target, `postgres.${PROJECT_ID}`)) process.exit(0);
    }
}

run();
