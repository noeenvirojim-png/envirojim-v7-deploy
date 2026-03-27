const { Client } = require('pg');

process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0'; // CRITICAL FIX

const project = 'mdbyrkxraplifqcrpqol';
const password = '@Enviro2018!';
const encodedPassword = encodeURIComponent(password);

const configs = [
    {
        name: 'User Provided (aws-1)',
        connectionString: `postgresql://postgres.${project}:${encodedPassword}@aws-1-us-east-1.pooler.supabase.com:6543/postgres?sslmode=require`
    }
];

async function test(config) {
    console.log(`\n🔌 Testing: ${config.name}`);

    const client = new Client({
        connectionString: config.connectionString,
        ssl: { rejectUnauthorized: false }
    });

    try {
        await client.connect();
        console.log('✅ SUCCESS! Connection established.');
        const res = await client.query('SELECT version()');
        console.log('Version:', res.rows[0].version);
        await client.end();
        return config.connectionString;
    } catch (err) {
        console.log(`❌ Failed: ${err.message}`);
        try { await client.end(); } catch (e) { }
        return null;
    }
}

async function run() {
    for (const config of configs) {
        const successUrl = await test(config);
        if (successUrl) {
            console.log('\n🎉 FOUND WORKING CONFIGURATION!');

            const fs = require('fs');
            let env = fs.readFileSync('.env.local', 'utf8');
            // Remove old POSTGRES_URL if exists
            env = env.replace(/^POSTGRES_URL=.*$/gm, '');
            // Append new one
            env += `\nPOSTGRES_URL=${successUrl}\n`;

            fs.writeFileSync('.env.local', env);
            console.log('✅ Updated .env.local');
            process.exit(0);
        }
    }
    console.error('❌ All attempts failed.');
    process.exit(1);
}

run();
