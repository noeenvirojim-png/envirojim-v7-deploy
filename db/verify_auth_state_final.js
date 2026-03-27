require('dotenv').config({ path: '.env.local' });
const { Client } = require('pg');

const connectionString = process.env.POSTGRES_URL.replace('?sslmode=require', '');

const client = new Client({
    connectionString,
    ssl: {
        rejectUnauthorized: false
    }
});

async function verifyAuthState() {
    try {
        console.log('🔌 Connecting to database for FINAL AUDIT...');
        await client.connect();

        const email = 'noe@envirojim.com';

        // 1. Check Auth User
        console.log('\n🔍 Check 1: auth.users (Password Update)');
        const resAuth = await client.query(
            `SELECT id, email, encrypted_password, updated_at, last_sign_in_at 
             FROM auth.users 
             WHERE email = $1`,
            [email]
        );

        if (resAuth.rows.length === 0) {
            console.log('❌ User NOT FOUND in auth.users');
        } else {
            const user = resAuth.rows[0];
            console.log('✅ User FOUND in auth.users');
            console.log(`   ID: ${user.id}`);
            console.log(`   Email: ${user.email}`);
            console.log(`   Updated At: ${user.updated_at}`);
            console.log(`   Password Hash (Prefix): ${user.encrypted_password.substring(0, 15)}...`);
        }

        // 2. Check Public User
        console.log('\n🔍 Check 2: public.users (Synchronization)');
        const resPublic = await client.query(
            `SELECT id, email, role, organization_id 
             FROM public.users 
             WHERE email = $1`,
            [email]
        );

        if (resPublic.rows.length === 0) {
            console.log('❌ User NOT FOUND in public.users');
        } else {
            const publicUser = resPublic.rows[0];
            console.log('✅ User FOUND in public.users');
            console.log(`   ID: ${publicUser.id}`);
            console.log(`   Role: ${publicUser.role}`);

            // Compare IDs
            if (resAuth.rows.length > 0 && resAuth.rows[0].id === publicUser.id) {
                console.log('✅ SYNC STATUS: MATCHING (IDs are identical)');
            } else {
                console.log('❌ SYNC STATUS: MISMATCH!');
                console.log(`   Auth ID:   ${resAuth.rows[0]?.id}`);
                console.log(`   Public ID: ${publicUser.id}`);
            }
        }

    } catch (err) {
        console.error('❌ SQL Error:', err);
    } finally {
        await client.end();
    }
}

verifyAuthState();
