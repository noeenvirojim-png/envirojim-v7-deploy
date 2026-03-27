const { Client } = require('pg');
const path = require('path');
require('dotenv').config({ path: path.resolve(process.cwd(), '.env.local') });

const connectionString = process.env.POSTGRES_URL || 'postgresql://postgres:postgres@127.0.0.1:54322/postgres';

async function fixPassword() {
    const client = new Client({ connectionString });
    try {
        await client.connect();
        
        console.log('--- RE-ESTABLISHING ADMIN AUTH RECORD ---');
        
        // Ensure pgcrypto is available
        await client.query('CREATE EXTENSION IF NOT EXISTS pgcrypto;');

        // Update password with real BCrypt hash
        const res = await client.query(`
            UPDATE auth.users 
            SET encrypted_password = crypt('EnviroJim2024!', gen_salt('bf', 10)),
                email_confirmed_at = now(),
                updated_at = now(),
                last_sign_in_at = NULL,
                raw_app_meta_data = '{"provider":"email","providers":["email"]}',
                raw_user_meta_data = '{"full_name":"Noe Admin"}'
            WHERE email = 'noe@envirojim.com'
            RETURNING id;
        `);

        if (res.rowCount === 0) {
            console.log('User not found, inserting fresh...');
            // Insert fresh if somehow missing (though we saw it earlier)
            await client.query(`
                INSERT INTO auth.users (
                    id, instance_id, email, encrypted_password, email_confirmed_at, 
                    raw_app_meta_data, raw_user_meta_data, created_at, updated_at, role, aud
                ) VALUES (
                    '00000000-0000-0000-0000-000000000001',
                    '00000000-0000-0000-0000-000000000000',
                    'noe@envirojim.com',
                    crypt('EnviroJim2024!', gen_salt('bf', 10)),
                    now(),
                    '{"provider":"email","providers":["email"]}',
                    '{"full_name":"Noe Admin"}',
                    now(),
                    now(),
                    'authenticated',
                    'authenticated'
                ) ON CONFLICT (id) DO UPDATE SET encrypted_password = EXCLUDED.encrypted_password;
            `);
        }

        console.log('✅ PASSWORDS SYNCHRONIZED. Local login should now work.');

    } catch (err) {
        console.error('❌ FIX FAILED:', err.message);
    } finally {
        await client.end();
    }
}

fixPassword();
