const { Client } = require('pg');
const path = require('path');
require('dotenv').config({ path: path.resolve(process.cwd(), '.env.local') });

const connectionString = process.env.POSTGRES_URL || 'postgresql://postgres:postgres@127.0.0.1:54322/postgres';

async function finalAuthFix() {
    const client = new Client({ connectionString });
    try {
        await client.connect();
        
        console.log('--- GETTING INSTANCE_ID ---');
        const instanceRes = await client.query("SELECT instance_id FROM auth.users WHERE instance_id IS NOT NULL LIMIT 1");
        const instanceId = instanceRes.rowCount > 0 ? instanceRes.rows[0].instance_id : '00000000-0000-0000-0000-000000000000';
        console.log('Using Instance ID:', instanceId);

        console.log('\n--- APPLYING FINAL REPAIR ---');
        // 1. Ensure user exists with correct instance_id and hash
        await client.query(`
            UPDATE auth.users 
            SET instance_id = '${instanceId}'::uuid,
                encrypted_password = crypt('EnviroJim2024!', gen_salt('bf', 10)),
                email_confirmed_at = now(),
                aud = 'authenticated',
                role = 'authenticated',
                updated_at = now()
            WHERE email = 'noe@envirojim.com'
        `);

        // 2. Ensure identity exists
        await client.query(`DELETE FROM auth.identities WHERE user_id = '00000000-0000-0000-0000-000000000001' AND provider = 'email'`);
        await client.query(`
            INSERT INTO auth.identities (
                id, user_id, identity_data, provider, provider_id, 
                last_sign_in_at, created_at, updated_at
            ) VALUES (
                gen_random_uuid(),
                '00000000-0000-0000-0000-000000000001',
                $1,
                'email',
                '00000000-0000-0000-0000-000000000001',
                now(),
                now(),
                now()
            )
        `, [JSON.stringify({ sub: '00000000-0000-0000-0000-000000000001', email: 'noe@envirojim.com' })]);

        console.log('✅ AUTH REPAIR COMPLETED.');

    } catch (err) {
        console.error('❌ REPAIR FAILED:', err.message);
    } finally {
        await client.end();
    }
}

finalAuthFix();
