
const { createClient } = require('@supabase/supabase-js');
const path = require('path');
const dotenv = require('dotenv');

dotenv.config({ path: path.join(process.cwd(), '.env.local') });

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function seedAdmin() {
    console.log('Seeding Super Admin (noe@envirojim.com)...');

    const email = 'noe@envirojim.com';
    const password = '@Enviro2018!';
    const orgId = '00000000-0000-0000-0000-000000000001'; // EnviroJim HQ

    // 1. Create/Get Auth User
    let userId;
    const { data: { users }, error: listError } = await supabase.auth.admin.listUsers();
    const existing = users.find(u => u.email === email);

    if (existing) {
        console.log('Auth user already exists:', existing.id);
        userId = existing.id;
        // Update password just in case
        await supabase.auth.admin.updateUserById(userId, { password });
    } else {
        const { data, error } = await supabase.auth.admin.createUser({
            email,
            password,
            email_confirm: true,
            user_metadata: {
                full_name: 'Noe EnviroJim',
                role: 'SUPER_ADMIN'
            }
        });

        if (error) {
            console.error('Error creating auth user:', error);
            process.exit(1);
        }
        console.log('Created Auth User:', data.user.id);
        userId = data.user.id;
    }

    // 2. Upsert Public User
    const { error: upsertError } = await supabase
        .from('users')
        .upsert({
            id: userId,
            organization_id: orgId,
            email: email,
            role: 'SUPER_ADMIN',
            full_name: 'Noe EnviroJim',
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
        });

    if (upsertError) {
        console.error('Error upserting public user:', upsertError);
        process.exit(1);
    }

    console.log('✅ Super Admin Seeded Successfully.');
}

seedAdmin();
