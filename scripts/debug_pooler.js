const { Client } = require('pg');
require('dotenv').config({ path: '.env.local' });

// Credentials from env
const PASSWORD = process.env.POSTGRES_URL.split(':')[2].split('@')[0].replace('%40', '@');
const PROJECT_ID = 'mdbyrkxraplifqcrpqol';

const TARGETS = [
    { region: 'us-east-1', host: 'aws-0-us-east-1.pooler.supabase.com' },
    { region: 'ca-central-1', host: 'aws-0-ca-central-1.pooler.supabase.com' },
    { region: 'eu-central-1', host: 'aws-0-eu-central-1.pooler.supabase.com' },
    { region: 'ap-southeast-1', host: 'aws-0-ap-southeast-1.pooler.supabase.com' },
];

async function testTarget(target) {
    console.log(`\n🔍 Testing ${target.region} (${target.host})...`);

    // Construct user explicitly for Supavisor
    const user = `postgres.${PROJECT_ID}`;

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
        console.log(`✅ SUCCESS! Connected to ${target.region}`);
        await client.end();
        return `postgresql://${user}:${encodeURIComponent(PASSWORD)}@${target.host}:6543/postgres?sslmode=require`;
    } catch (err) {
        console.log(`❌ Failed: ${err.message}`);
        // console.log(err); // debug
        try { await client.end(); } catch (e) { }
        return null;
    }
}

async function run() {
    console.log(`Debug Pooler: Project=${PROJECT_ID}, User=postgres.${PROJECT_ID}`);

    for (const target of TARGETS) {
        const successUrl = await testTarget(target);
        if (successUrl) {
            console.log(`\n🎉 FOUND WORKING URL:\n${successUrl}`);
            const envContent = `POSTGRES_URL=${successUrl}`;
            const fs = require('fs');
            fs.writeFileSync('.env.local.pooler', envContent);
            console.log('Saved to .env.local.pooler');
            process.exit(0);
        }
    }
    console.log('\n❌ All pooler targets failed.');
}

run();
