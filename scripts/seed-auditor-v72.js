const { createClient } = require('@supabase/supabase-js');

// Configuration from Environment
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
    console.error('FAILURE: Missing environment variables.');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: {
        autoRefreshToken: false,
        persistSession: false
    }
});

const email = 'auditor-v6@envirojim.com';
const password = 'EnviroJim2024!';
const orgId = '00000000-0000-0000-0000-000000000001';

async function seed() {
    console.log(`Starting seeding for ${email}...`);
    try {
        // 1. Check if user exists in Auth
        const { data: { users }, error: listError } = await supabase.auth.admin.listUsers();
        if (listError) throw listError;
        
        const existingAuthUser = users.find(u => u.email === email);
        let userId;

        if (existingAuthUser) {
            userId = existingAuthUser.id;
            console.log(`Updating existing auth user: ${userId}`);
            const { error: updateError } = await supabase.auth.admin.updateUserById(userId, {
                password: password,
                user_metadata: { 
                    role: 'ENVIROJIM_ADMIN',
                    full_name: 'Enterprise Auditor'
                },
                app_metadata: {
                    role: 'ENVIROJIM_ADMIN',
                    organization_id: orgId
                }
            });
            if (updateError) throw updateError;
        } else {
            console.log('Creating new auth user...');
            const { data: createData, error: createError } = await supabase.auth.admin.createUser({
                email,
                password,
                email_confirm: true,
                user_metadata: { 
                    role: 'ENVIROJIM_ADMIN',
                    full_name: 'Enterprise Auditor'
                },
                app_metadata: {
                    role: 'ENVIROJIM_ADMIN',
                    organization_id: orgId
                }
            });
            if (createError) throw createError;
            userId = createData.user.id;
        }

        // 2. Sync with public.users
        console.log(`Syncing public.users for ID: ${userId}`);
        const { error: upsertError } = await supabase
            .from('users')
            .upsert({
                id: userId,
                email: email,
                role: 'ENVIROJIM_ADMIN',
                organization_id: orgId,
                full_name: 'Enterprise Auditor',
                updated_at: new Date().toISOString()
            });
        
        if (upsertError) throw upsertError;

        console.log('SUCCESS: Auditor account provisioned and synchronized.');
    } catch (e) {
        console.error('FATAL ERROR:', e.message);
        process.exit(1);
    }
}

seed();
