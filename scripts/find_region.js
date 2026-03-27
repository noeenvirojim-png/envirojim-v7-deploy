const { Client } = require('pg');
const fs = require('fs');
require('dotenv').config({ path: '.env.local' });
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

const PROJECT_ID = 'mdbyrkxraplifqcrpqol';
const PASSWORD = process.env.POSTGRES_URL.split(':')[2].split('@')[0].replace('%40', '@');

const REGIONS = [
    'aws-0-us-east-1',
    'aws-0-eu-central-1',
    'aws-0-ap-southeast-1',
    'aws-0-sa-east-1',
    'aws-0-eu-west-1',
    'aws-0-eu-west-2',
    'aws-0-eu-west-3',
    'aws-0-ca-central-1',
    'aws-0-us-west-1',
    'aws-0-ap-northeast-1',
    'aws-0-ap-south-1',
    'aws-0-ap-northeast-2',
    'aws-0-ap-southeast-2',
    'aws-0-eu-north-1',
    'aws-0-us-east-2',
    'aws-0-us-west-2',
    'aws-0-eu-central-2',
    'fly-0-iad'
];

const LOG_FILE = 'region_scan.log';
fs.writeFileSync(LOG_FILE, `Scanning for ${PROJECT_ID}...\n`);

async function tryRegion(region) {
    const host = `${region}.pooler.supabase.com`;
    const connStr = `postgres://postgres.${PROJECT_ID}:${encodeURIComponent(PASSWORD)}@${host}:6543/postgres?sslmode=require`;

    const msg = `Trying ${region} (${host})...`;
    console.log(msg);
    fs.appendFileSync(LOG_FILE, msg + '\n');

    const client = new Client({
        connectionString: connStr,
        ssl: { rejectUnauthorized: false },
        connectionTimeoutMillis: 5000 // 5s timeout
    });

    try {
        await client.connect();
        const res = await client.query('SELECT current_database()');
        const successMsg = `✅ SUCCESS! Connected to ${region}`;
        console.log(successMsg);
        fs.appendFileSync(LOG_FILE, successMsg + '\n');
        await client.end();
        return region;
    } catch (err) {
        let failureMsg = `❌ Failed: ${err.message.split('\n')[0]}`;
        if (err.message.includes('password authentication failed')) {
            failureMsg = `❌ Auth Failed (Region correct?): ${err.message.split('\n')[0]}`;
        }
        console.log(failureMsg);
        fs.appendFileSync(LOG_FILE, failureMsg + '\n');
        try { await client.end(); } catch (e) { }
        return null;
    }
}

async function findRegion() {
    for (const region of REGIONS) {
        const result = await tryRegion(region);
        if (result) {
            console.log(`🎉 FOUND PROJECT IN REGION: ${result}`);
            fs.appendFileSync(LOG_FILE, `🎉 FOUND PROJECT IN REGION: ${result}\n`);
            process.exit(0);
        }
    }
    console.log('❌ Project not found in any common region.');
    fs.appendFileSync(LOG_FILE, '❌ Project not found in any common region.\n');
    process.exit(1);
}

findRegion();
