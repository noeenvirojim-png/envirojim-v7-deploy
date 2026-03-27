const { Client } = require('pg');
const path = require('path');
require('dotenv').config({ path: path.resolve(process.cwd(), '.env.local') });

const connectionString = process.env.POSTGRES_URL || 'postgresql://postgres:postgres@127.0.0.1:54322/postgres';

async function fixIdentities() {
    const client = new Client({ connectionString });
    try {
        await client.connect();
        
        console.log('--- CHECKING AUTH.USERS ---');
        const userRes = await client.query("SELECT id, email FROM auth.users WHERE email = 'noe@envirojim.com'");
        const user = userRes.rows[0];

        if (!user) {
            console.error('❌ User noe@envirojim.com NOT FOUND in auth.users');
            return;
        }
        console.log('User found:', user.id);

        console.log('\n--- CHECKING AUTH.IDENTITIES ---');
        const identityRes = await client.query("SELECT id FROM auth.identities WHERE user_id = $1", [user.id]);
        
        if (identityRes.rowCount === 0) {
            console.log('⚠️ Identity MISSING. Inserting email identity...');
            
            // Note: In Supabase/GoTrue, identity id is often a random uuid or provider-specific
            await client.query(`
                INSERT INTO auth.identities (
                    id, 
                    user_id, 
                    identity_data, 
                    provider, 
                    provider_id,
                    last_sign_in_at, 
                    created_at, 
                    updated_at
                ) VALUES (
                    gen_random_uuid(),
                    $1::uuid,
                    $2,
                    'email',
                    $1::text,
                    now(),
                    now(),
                    now()
                )
            `, [user.id, JSON.stringify({ sub: user.id, email: user.email })]);
            
            console.log('✅ Identity inserted successfully.');
        } else {
            console.log('✅ Identity already exists:', identityRes.rows[0].id);
        }

        // Ensuring aud is correct in users
        await client.query("UPDATE auth.users SET aud = 'authenticated', role = 'authenticated' WHERE id = $1", [user.id]);
        console.log('✅ Auth users metadata updated.');

    } catch (err) {
        console.error('❌ FIX FAILED:', err.message);
    } finally {
        await client.end();
    }
}

fixIdentities();
