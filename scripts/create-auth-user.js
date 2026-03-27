const https = require('https');
require('dotenv').config({ path: '.env.local' });

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SERVICE_KEY || SERVICE_KEY.includes('COLLE_TA_CLE')) {
    console.error('❌ Error: SUPABASE_SERVICE_ROLE_KEY is missing or invalid in .env.local');
    process.exit(1);
}

const users = [
    {
        email: 'noe@envirojim.com',
        password: 'password123',
        email_confirm: true
    }
];

async function createUser(user) {
    return new Promise((resolve, reject) => {
        const data = JSON.stringify({
            email: user.email,
            password: user.password,
            email_confirm: user.email_confirm
        });

        const url = new URL(`${SUPABASE_URL}/auth/v1/admin/users`);

        const options = {
            hostname: url.hostname,
            path: url.pathname,
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'apikey': SERVICE_KEY,
                'Authorization': `Bearer ${SERVICE_KEY}`,
                'Content-Length': data.length
            }
        };

        const req = https.request(options, (res) => {
            let body = '';
            res.on('data', (chunk) => body += chunk);
            res.on('end', () => {
                if (res.statusCode === 200 || res.statusCode === 201) {
                    console.log(`✅ Created user: ${user.email}`);
                    resolve(JSON.parse(body));
                } else {
                    console.error(`❌ Failed (${res.statusCode}): ${body}`);
                    reject(new Error(body));
                }
            });
        });

        req.on('error', reject);
        req.write(data);
        req.end();
    });
}

async function main() {
    console.log('🔍 Attempting to create auth users...\n');
    console.log('Supabase URL:', SUPABASE_URL);
    console.log('Using SERVICE_ROLE_KEY (Admin Access)\n');

    for (const user of users) {
        try {
            await createUser(user);
        } catch (error) {
            console.error(`\n❌ Error for ${user.email}:`, error.message);

            if (error.message.includes('service_role')) {
                console.log('\n⚠️  SOLUTION REQUIRED:');
                console.log('The ANON_KEY cannot create users. You need the SERVICE_ROLE_KEY.');
                console.log('\nSteps to get it:');
                console.log('1. Go to: https://supabase.com/dashboard/project/zqnijnhrzqtflpuhxkwv/settings/api');
                console.log('2. Copy the "service_role" key (secret)');
                console.log('3. Add to .env.local: SUPABASE_SERVICE_ROLE_KEY=your_key_here');
                console.log('4. Re-run this script');
            }
        }
    }
}

main();
