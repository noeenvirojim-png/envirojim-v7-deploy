
const { createClient } = require('@supabase/supabase-js');
const { Client } = require('pg');
const path = require('path');
require('dotenv').config({ path: path.join(process.cwd(), '.env.local') });

process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

async function seedMaster() {
    const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL,
        process.env.SUPABASE_SERVICE_ROLE_KEY
    );

    const pgClient = new Client({
        connectionString: process.env.POSTGRES_URL,
        ssl: { rejectUnauthorized: false }
    });
    await pgClient.connect();

    const DEFAULT_ORG = '00000000-0000-0000-0000-000000000001'; // EnviroJim HQ
    const ACME_ORG = 'd3819632-ce1c-4a21-a157-e345fb9e639f'; // Acme Mining Co.

    console.log("🚀 Starting Master Synchronization (Auth Admin API + Public Postgres)...");

    // Ensure organizations exist
    await pgClient.query(`
        INSERT INTO public.organizations (id, name, type) VALUES 
        ($1, 'EnviroJim HQ', 'ENVIROJIM'),
        ($2, 'Acme Mining Co.', 'CLIENT')
        ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, type = EXCLUDED.type;
    `, [DEFAULT_ORG, ACME_ORG]);

    const users = [
        { email: 'noe@envirojim.com', password: '@Enviro2018!', authRole: 'SUPER_ADMIN', publicRole: 'SUPER_ADMIN', name: 'Noe EnviroJim', orgId: DEFAULT_ORG },
        { email: 'auditor-v6@envirojim.com', password: 'EnviroJim2024!', authRole: 'SUPER_ADMIN', publicRole: 'SUPER_ADMIN', name: 'Enterprise Auditor', orgId: DEFAULT_ORG },
        { email: 'manager@acmemining.com', password: 'EnviroJim2024!', authRole: 'ORG_ADMIN', publicRole: 'CLIENT_ADMIN', name: 'Mike Manager', orgId: ACME_ORG },
        { email: 'tech@northernsp.com', password: 'EnviroJim2024!', authRole: 'TECHNICIAN', publicRole: 'TECHNICIAN', name: 'Terry Technician', orgId: DEFAULT_ORG },
        { email: 'contract-admin@envirojim.com', password: 'EnviroJim2024!', authRole: 'ORG_ADMIN', publicRole: 'SERVICE_PROVIDER_ADMIN', name: 'Contract Admin', orgId: DEFAULT_ORG },
        { email: 'contract-tech@envirojim.com', password: 'EnviroJim2024!', authRole: 'TECHNICIAN', publicRole: 'TECHNICIAN', name: 'Contract Tech', orgId: DEFAULT_ORG },
        { email: 'admin@northernsp.com', password: 'EnviroJim2024!', authRole: 'ORG_ADMIN', publicRole: 'SERVICE_PROVIDER_ADMIN', name: 'Nancy Admin', orgId: DEFAULT_ORG }
    ];

    for (const user of users) {
        console.log(`Processing ${user.email}...`);

        // 1. Auth Admin API
        const { data: { users: existingUsers } } = await supabase.auth.admin.listUsers();
        let authUser = existingUsers.find(u => u.email === user.email);

        if (authUser) {
            console.log(`Updating auth user ${user.email}...`);
            const { data, error } = await supabase.auth.admin.updateUserById(authUser.id, {
                password: user.password,
                app_metadata: { role: user.authRole, organization_id: user.orgId },
                user_metadata: { full_name: user.name },
                email_confirm: true
            });
            if (error) { console.error(`❌ Auth update failed for ${user.email}:`, error.message); continue; }
        } else {
            console.log(`Creating auth user ${user.email}...`);
            const { data, error } = await supabase.auth.admin.createUser({
                email: user.email,
                password: user.password,
                app_metadata: { role: user.authRole, organization_id: user.orgId },
                user_metadata: { full_name: user.name },
                email_confirm: true
            });
            if (error) { console.error(`❌ Auth creation failed for ${user.email}:`, error.message); continue; }
            authUser = data.user;
        }

        const userId = authUser.id;

        // 2. Public Postgres Sync
        await pgClient.query('DELETE FROM public.users WHERE email = $1 AND id != $2', [user.email, userId]);
        await pgClient.query('DELETE FROM public.users WHERE id = $1 AND email != $2', [userId, user.email]);

        const publicQuery = `
            INSERT INTO public.users (id, email, full_name, role, organization_id, updated_at)
            VALUES ($1, $2, $3, $4, $5, now())
            ON CONFLICT (id) DO UPDATE SET 
                email = EXCLUDED.email,
                full_name = EXCLUDED.full_name,
                role = EXCLUDED.role,
                organization_id = EXCLUDED.organization_id,
                updated_at = now();
        `;
        try {
            await pgClient.query(publicQuery, [userId, user.email, user.name, user.publicRole, user.orgId]);
            console.log(`✅ Synced: ${user.email} -> ID: ${userId}`);
        } catch (e) {
            console.error(`❌ Public sync failed for ${user.email}:`, e.message);
        }
    }

    await pgClient.end();
    console.log("🏁 Master synchronization finished.");
}

seedMaster();
