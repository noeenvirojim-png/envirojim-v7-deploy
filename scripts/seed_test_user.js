require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

// ============================================================================
// SEED TEST USER
// ============================================================================
// Creates test user in auth.users and public.users
// Run AFTER executing INIT_SCHEMA.sql
// ============================================================================

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const TEST_USER = {
    email: 'noe@envirojim.com',
    password: 'EnviroJim2024!',
    full_name: 'Noe Admin',
    role: 'SUPER_ADMIN'
};

async function seedTestUser() {
    console.log('🌱 Seeding test user...\n');

    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
        auth: {
            autoRefreshToken: false,
            persistSession: false
        }
    });

    try {
        // 1. Check if user already exists in auth.users
        const { data: existingUsers } = await supabase.auth.admin.listUsers();
        const existing = existingUsers?.users?.find(u => u.email === TEST_USER.email);

        if (existing) {
            console.log(`✓ User ${TEST_USER.email} already exists in auth.users`);
            console.log(`  User ID: ${existing.id}`);

            // Check if exists in public.users
            const { data: publicUser } = await supabase
                .from('users')
                .select('*')
                .eq('id', existing.id)
                .single();

            if (publicUser) {
                console.log(`✓ User already exists in public.users`);
                console.log(`  Role: ${publicUser.role}`);
                console.log('\n✅ Test user already seeded!');
                return;
            } else {
                console.log(`⚠️  User exists in auth.users but not in public.users`);
                console.log(`  Inserting into public.users...`);

                const { error: insertError } = await supabase
                    .from('users')
                    .insert({
                        id: existing.id,
                        email: TEST_USER.email,
                        full_name: TEST_USER.full_name,
                        role: TEST_USER.role
                    });

                if (insertError) {
                    console.error(`❌ Failed to insert into public.users:`, insertError);
                    process.exit(1);
                }

                console.log(`✓ Inserted into public.users`);
                console.log('\n✅ Test user seeded successfully!');
                return;
            }
        }

        // 2. Create user in auth.users
        console.log(`Creating user in auth.users...`);
        const { data: authData, error: authError } = await supabase.auth.admin.createUser({
            email: TEST_USER.email,
            password: TEST_USER.password,
            email_confirm: true,
            user_metadata: {
                full_name: TEST_USER.full_name
            }
        });

        if (authError) {
            console.error(`❌ Failed to create user in auth.users:`, authError);
            process.exit(1);
        }

        console.log(`✓ Created user in auth.users`);
        console.log(`  User ID: ${authData.user.id}`);

        // 3. Insert into public.users
        console.log(`Inserting into public.users...`);
        const { error: insertError } = await supabase
            .from('users')
            .insert({
                id: authData.user.id,
                email: TEST_USER.email,
                full_name: TEST_USER.full_name,
                role: TEST_USER.role
            });

        if (insertError) {
            console.error(`❌ Failed to insert into public.users:`, insertError);
            console.log(`⚠️  Cleaning up auth.users entry...`);
            await supabase.auth.admin.deleteUser(authData.user.id);
            process.exit(1);
        }

        console.log(`✓ Inserted into public.users`);
        console.log(`  Role: ${TEST_USER.role}`);

        console.log('\n✅ Test user seeded successfully!');
        console.log(`\n🔑 Test credentials:`);
        console.log(`   Email: ${TEST_USER.email}`);
        console.log(`   Password: ${TEST_USER.password}`);
        console.log(`   User ID: ${authData.user.id}`);

    } catch (error) {
        console.error('❌ Unexpected error:', error);
        process.exit(1);
    }
}

seedTestUser();
