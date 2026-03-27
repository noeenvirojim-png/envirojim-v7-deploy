// ============================================================================
// ENVIROJIM V6 ULTIMATE - Auth User Setup Script
// ============================================================================
// 
// This script creates auth.users for the production users defined in the schema
// and updates public.users with the correct UUIDs.
//
// USAGE:
// 1. Update SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env.local
// 2. Run: node db/setup-auth-users.js
// ============================================================================

require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');
const { Client } = require('pg');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
    console.error('❌ Missing environment variables!');
    console.error('   NEXT_PUBLIC_SUPABASE_URL:', supabaseUrl ? '✅' : '❌');
    console.error('   SUPABASE_SERVICE_ROLE_KEY:', serviceRoleKey ? '✅' : '❌');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: {
        autoRefreshToken: false,
        persistSession: false
    }
});

// ✨ PRODUCTION USERS (Real credentials)
const PRODUCTION_USERS = [
    {
        email: 'noe@envirojim.com',
        password: '@Enviro2018!',
        full_name: 'Noé EVE',
        role: 'SUPER_ADMIN',
        organization_id: '00000000-0000-0000-0000-000000000001' // EnviroJim HQ
    },
    {
        email: 'parts@envirojim.com',
        password: '@JimEnviro18!',
        full_name: 'Alexandre Paré',
        role: 'ENVIROJIM_ADMIN',
        organization_id: '00000000-0000-0000-0000-000000000001' // EnviroJim HQ
    }
];

async function setupAuthUsers() {
    console.log('🚀 Starting auth user setup...\n');

    for (const user of PRODUCTION_USERS) {
        console.log(`📧 Creating user: ${user.email} (${user.role})`);

        try {
            // Create auth user
            const { data: authData, error: authError } = await supabase.auth.admin.createUser({
                email: user.email,
                password: user.password,
                email_confirm: true,
                user_metadata: {
                    full_name: user.full_name
                }
            });

            let authUserId;

            if (authError) {
                console.error(`   ⚠️ Auth creation failed: ${authError.message}`);
                // If user exists, try to get their ID and update password
                if (authError.message.includes('already been registered')) {
                    console.log('   🔄 User exists. Updating password...');
                    const { data: existingUser } = await supabase.auth.admin.listUsers();
                    const match = existingUser.users.find(u => u.email === user.email);

                    if (match) {
                        authUserId = match.id;
                        const { error: updateAuthError } = await supabase.auth.admin.updateUserById(
                            authUserId,
                            { password: user.password, user_metadata: { full_name: user.full_name } }
                        );

                        if (updateAuthError) {
                            console.error(`   ❌ Failed to update password: ${updateAuthError.message}`);
                            continue;
                        }
                        console.log(`   ✅ Password updated for user: ${authUserId}`);
                    } else {
                        console.error('   ❌ Could not find existing user ID.');
                        continue;
                    }
                } else {
                    continue;
                }
            } else {
                authUserId = authData.user.id;
            }
            console.log(`   ✅ Auth user created/found: ${authUserId}`);

            // Direct PG insertion for reliability - FORCE DIRECT CONNECTION (Bypass 6543 pooler)
            const pgClient = new Client({
                connectionString: process.env.POSTGRES_URL.replace('6543', '5432'),
                ssl: { rejectUnauthorized: false }
            });
            await pgClient.connect();

            try {
                // Upsert into public.users using proven logic
                // Check if user exists to decide INSERT vs UPDATE (simpler than ON CONFLICT sometimes)
                const { rows: existing } = await pgClient.query('SELECT * FROM public.users WHERE id = $1', [authUserId]);

                if (existing.length > 0) {
                    console.log('   🔄 User exists in public.users, updating...');
                    const updateQ = 'UPDATE public.users SET role=$1, email=$2, full_name=$3 WHERE id=$4';
                    console.log(`   📝 EXEC SQL: ${updateQ} with [${user.role}, ${user.email}, ${user.full_name}, ${authUserId}]`);
                    await pgClient.query(updateQ, [user.role, user.email, user.full_name, authUserId]);
                } else {
                    console.log('   🆕 Inserting new user into public.users...');
                    const insertQ = 'INSERT INTO public.users (id, organization_id, role, email, full_name) VALUES ($1, $2, $3, $4, $5)';
                    console.log(`   📝 EXEC SQL: ${insertQ} with [${authUserId}, ${user.organization_id}, ${user.role}, ${user.email}, ${user.full_name}]`);
                    await pgClient.query(insertQ, [authUserId, user.organization_id, user.role, user.email, user.full_name]);
                }

                console.log(`   ✅ Persisted to public.users via direct PG connection.`);

                // Explicit commit
                await pgClient.query('COMMIT');

            } catch (pgError) {
                console.error(`   ❌ PG Insert Failed: ${pgError.message}`);
                // Re-throw to stop script if critical failure
                throw pgError;
            } finally {
                await pgClient.end();
            }

        } catch (error) {
            console.error(`   ❌ Unexpected error: ${error.message}\n`);
        }
    }

    // ✨ VERIFICATION STEP
    console.log('🔍 Verifying credentials for noe@envirojim.com...');
    const verificationClient = createClient(supabaseUrl, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
    const { data: loginData, error: loginError } = await verificationClient.auth.signInWithPassword({
        email: 'noe@envirojim.com',
        password: '@Enviro2018!'
    });

    if (loginError) {
        console.error(`   ❌ Verification Login Failed: ${loginError.message}`);
    } else {
        console.log(`   ✅ Verification Login Successful! User ID: ${loginData.user.id}`);
        console.log(`   🔑 Access Token generated.`);
    }

    console.log('🎉 Auth user setup complete!\n');
    console.log('📋 Next steps:');
    console.log('   1. Test login with: noe@envirojim.com / @Enviro2018!');
    console.log('   2. Test login with: parts@envirojim.com / @JimEnviro18!');
    console.log('   3. Create additional users via the app UI\n');
}

setupAuthUsers().catch(console.error);
