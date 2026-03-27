const { createClient } = require('@supabase/supabase-js');
const path = require('path');
const dotenv = require('dotenv');

dotenv.config({ path: path.join(process.cwd(), '.env.local') });

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function seedAuditor() {
    console.log('Seeding Auditor (auditor-v6@envirojim.com)...');

    const email = 'auditor-v6@envirojim.com';
    const password = 'EnviroJim2024!';
    const orgId = '00000000-0000-0000-0000-000000000001'; // Default system org

    // 1. Create/Get Auth User
    let userId;
    const { data: { users }, error: listError } = await supabase.auth.admin.listUsers();
    const existing = users.find(u => u.email === email);

    if (existing) {
        console.log('Auth user already exists:', existing.id);
        userId = existing.id;
        await supabase.auth.admin.updateUserById(userId, { 
            password,
            user_metadata: { role: 'ENVIROJIM_ADMIN', full_name: 'Enterprise Auditor' } 
        });
    } else {
        const { data, error } = await supabase.auth.admin.createUser({
            email,
            password,
            email_confirm: true,
            user_metadata: {
                full_name: 'Enterprise Auditor',
                role: 'ENVIROJIM_ADMIN'
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
            role: 'ENVIROJIM_ADMIN',
            full_name: 'Enterprise Auditor',
            updated_at: new Date().toISOString()
        });

    if (upsertError) {
        console.error('Error upserting public user:', upsertError);
        process.exit(1);
    }

    console.log('✅ Auditor Seeded Successfully.');
}

seedAuditor();
