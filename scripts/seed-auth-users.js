const { Client } = require('pg');
require('dotenv').config({ path: '.env.local' });

process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

async function seedAuthUsers() {
    const client = new Client({
        connectionString: process.env.POSTGRES_URL,
        ssl: { rejectUnauthorized: false }
    });

    try {
        await client.connect();
        console.log('✅ Connected to Supabase PostgreSQL');

        const DEFAULT_ORG = '00000000-0000-0000-0000-000000000001'; // EnviroJim HQ
        const ACME_ORG = 'd3819632-ce1c-4a21-a157-e345fb9e639f'; // Acme Mining Co.

        const users = [
            {
                email: 'noe@envirojim.com',
                password: '@Enviro2018!',
                authRole: 'SUPER_ADMIN',
                publicRole: 'SUPER_ADMIN',
                name: 'Noe EnviroJim',
                orgId: DEFAULT_ORG
            },
            {
                email: 'auditor-v6@envirojim.com',
                password: 'EnviroJim2024!',
                authRole: 'SUPER_ADMIN',
                publicRole: 'SUPER_ADMIN',
                name: 'Enterprise Auditor',
                orgId: DEFAULT_ORG
            },
            {
                email: 'manager@acmemining.com',
                password: 'EnviroJim2024!',
                authRole: 'ORG_ADMIN',
                publicRole: 'CLIENT_ADMIN',
                name: 'Mike Manager',
                orgId: ACME_ORG
            },
            {
                email: 'tech@northernsp.com',
                password: 'EnviroJim2024!',
                authRole: 'TECHNICIAN',
                publicRole: 'TECHNICIAN',
                name: 'Terry Technician',
                orgId: DEFAULT_ORG
            },
            {
                email: 'contract-admin@envirojim.com',
                password: 'EnviroJim2024!',
                authRole: 'ORG_ADMIN',
                publicRole: 'SERVICE_PROVIDER_ADMIN',
                name: 'Contract Admin',
                orgId: DEFAULT_ORG
            },
            {
                email: 'contract-tech@envirojim.com',
                password: 'EnviroJim2024!',
                authRole: 'TECHNICIAN',
                publicRole: 'TECHNICIAN',
                name: 'Contract Tech',
                orgId: DEFAULT_ORG
            },
            {
                email: 'admin@northernsp.com',
                password: 'EnviroJim2024!',
                authRole: 'ORG_ADMIN',
                publicRole: 'SERVICE_PROVIDER_ADMIN',
                name: 'Nancy Admin',
                orgId: DEFAULT_ORG
            }
        ];

        for (const user of users) {
            try {
                // 1. Get existing ID from public.users if possible to maintain consistency
                let userId;
                const publicUserRes = await client.query('SELECT id FROM public.users WHERE email = $1', [user.email]);
                if (publicUserRes.rows.length > 0) {
                    userId = publicUserRes.rows[0].id;
                } else {
                    const authUserRes = await client.query('SELECT id FROM auth.users WHERE email = $1', [user.email]);
                    userId = authUserRes.rows.length > 0 ? authUserRes.rows[0].id : require('crypto').randomUUID();
                }

                // 2. Proactively delete mismatched records to enforce synchronization
                // This ensures we have exactly ONE user with this email across both schemas
                await client.query('DELETE FROM auth.identities WHERE user_id IN (SELECT id FROM auth.users WHERE email = $1 AND id != $2)', [user.email, userId]);
                await client.query('DELETE FROM auth.users WHERE email = $1 AND id != $2', [user.email, userId]);
                await client.query('DELETE FROM public.users WHERE email = $1 AND id != $2', [user.email, userId]);

                // 3. Upsert auth.users with correct metadata for middleware
                const authQuery = `
                    INSERT INTO auth.users (
                        id, instance_id, email, encrypted_password, email_confirmed_at, 
                        created_at, updated_at, raw_app_meta_data, raw_user_meta_data, 
                        is_super_admin, role, aud, confirmed_at
                    ) VALUES (
                        $1::uuid, '00000000-0000-0000-0000-000000000000'::uuid, $2, 
                        crypt($3, gen_salt('bf')), now(), now(), now(), 
                        jsonb_build_object('provider', 'email', 'providers', ARRAY['email'], 'role', $4::text, 'organization_id', $5::text),
                        '{}'::jsonb, false, 'authenticated', 'authenticated', now()
                    )
                    ON CONFLICT (id) DO UPDATE SET 
                        encrypted_password = EXCLUDED.encrypted_password,
                        raw_app_meta_data = EXCLUDED.raw_app_meta_data,
                        updated_at = now(),
                        confirmed_at = now(),
                        email_confirmed_at = now();
                `;
                await client.query(authQuery, [userId, user.email, user.password, user.authRole, user.orgId]);

                // 4. Upsert public.users with ENUM compatibility
                const publicQuery = `
                    INSERT INTO public.users (
                        id, email, full_name, role, organization_id, updated_at
                    ) VALUES (
                        $1::uuid, $2, $3, $4, $5, now()
                    )
                    ON CONFLICT (id) DO UPDATE SET 
                        email = EXCLUDED.email,
                        full_name = EXCLUDED.full_name,
                        role = EXCLUDED.role,
                        organization_id = EXCLUDED.organization_id,
                        updated_at = now();
                `;
                await client.query(publicQuery, [userId, user.email, user.name, user.publicRole, user.orgId]);

                // 5. Upsert identities (CRITICAL for login)
                await client.query('DELETE FROM auth.identities WHERE user_id = $1::uuid OR (provider=\'email\' AND identity_data->>\'email\' = $2)', [userId, user.email]);
                const identityQuery = `
                    INSERT INTO auth.identities (
                        id, user_id, identity_data, provider, provider_id, last_sign_in_at, created_at, updated_at
                    ) VALUES (
                        gen_random_uuid(), $1::uuid, jsonb_build_object('sub', $1::text, 'email', $2), 'email', $1::text, now(), now(), now()
                    )
                `;
                await client.query(identityQuery, [userId, user.email]);

                console.log(`✅ Fully Seeded & Synced: ${user.email} (AuthRole: ${user.authRole}, PublicRole: ${user.publicRole})`);

            } catch (error) {
                console.error(`❌ Failed to sync ${user.email}:`, error.message);
            }
        }

        console.log('\n✅ Master seeding completed!');

    } catch (error) {
        console.error('❌ Connection or execution error:', error.message);
    } finally {
        await client.end();
    }
}

seedAuthUsers();
