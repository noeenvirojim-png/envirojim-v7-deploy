
const { createClient } = require('@supabase/supabase-js');
const path = require('path');
require('dotenv').config({ path: path.join(process.cwd(), '.env.local') });

async function seedWithAdminApi() {
    const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL,
        process.env.SUPABASE_SERVICE_ROLE_KEY,
        {
            auth: {
                autoRefreshToken: false,
                persistSession: false
            }
        }
    );

    const users = [
        { email: 'noe@envirojim.com', password: '@Enviro2018!', role: 'SUPER_ADMIN', name: 'Noe EnviroJim' },
        { email: 'auditor-v6@envirojim.com', password: 'EnviroJim2024!', role: 'SUPER_ADMIN', name: 'Enterprise Auditor' },
        { email: 'manager@acmemining.com', password: 'EnviroJim2024!', role: 'ORG_ADMIN', name: 'Mike Manager' },
        { email: 'tech@northernsp.com', password: 'EnviroJim2024!', role: 'TECHNICIAN', name: 'Terry Technician' },
        { email: 'contract-admin@envirojim.com', password: 'EnviroJim2024!', role: 'ORG_ADMIN', name: 'Contract Admin' },
        { email: 'contract-tech@envirojim.com', password: 'EnviroJim2024!', role: 'TECHNICIAN', name: 'Contract Tech' },
        { email: 'admin@northernsp.com', password: 'EnviroJim2024!', role: 'ORG_ADMIN', name: 'Nancy Admin' }
    ];

    const ORG_ID = '00000000-0000-0000-0000-000000000001';

    console.log("🚀 Starting Seeding via Auth Admin API...");

    for (const user of users) {
        console.log(`Processing ${user.email}...`);

        // 1. Check if user exists
        const { data: { users: existingUsers }, error: listError } = await supabase.auth.admin.listUsers();
        if (listError) {
            console.error("❌ Error listing users:", listError.message);
            break;
        }

        const existingUser = existingUsers.find(u => u.email === user.email);

        if (existingUser) {
            console.log(`Found existing user ${user.email}. Updating...`);
            const { data, error } = await supabase.auth.admin.updateUserById(
                existingUser.id,
                {
                    password: user.password,
                    app_metadata: {
                        role: user.role,
                        organization_id: (user.email === 'manager@acmemining.com') ? 'd3819632-ce1c-4a21-a157-e345fb9e639f' : ORG_ID
                    },
                    user_metadata: { full_name: user.name },
                    email_confirm: true
                }
            );
            if (error) console.error(`❌ Update failed for ${user.email}:`, error.message);
            else console.log(`✅ Updated ${user.email}`);
        } else {
            console.log(`Creating new user ${user.email}...`);
            const { data, error } = await supabase.auth.admin.createUser({
                email: user.email,
                password: user.password,
                app_metadata: {
                    role: user.role,
                    organization_id: (user.email === 'manager@acmemining.com') ? 'd3819632-ce1c-4a21-a157-e345fb9e639f' : ORG_ID
                },
                user_metadata: { full_name: user.name },
                email_confirm: true
            });
            if (error) console.error(`❌ Creation failed for ${user.email}:`, error.message);
            else console.log(`✅ Created ${user.email}`);
        }
    }

    console.log("🏁 Admin seeding finished.");
}

seedWithAdminApi();
