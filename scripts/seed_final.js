
const { createClient } = require('@supabase/supabase-js');
const { Client } = require('pg');
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: '.env.local' });

process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

async function finalSeed() {
    console.log('🚀 FINAL ENVIROJIM SEED (Corrected Enums)');

    const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
    const pgClient = new Client({ connectionString: process.env.POSTGRES_URL, ssl: { rejectUnauthorized: false } });

    const users = [
        { id: '11111111-1111-1111-1111-111111111111', email: 'noe@envirojim.com', name: 'Noe Admin' },
        { id: '66666666-6666-6666-6666-666666666666', email: 'tech@northernsp.com', name: 'Terry Technician' },
        { id: '22222222-2222-2222-2222-222222222222', email: 'parts@envirojim.com', name: 'Support specialist' }
    ];

    try {
        console.log('\n🔐 Syncing Key Auth Users...');
        for (const u of users) {
            const { error } = await supabase.auth.admin.createUser({
                id: u.id,
                email: u.email,
                password: 'password123',
                email_confirm: true,
                user_metadata: { full_name: u.name }
            });
            if (error && !error.message.includes('already exists')) {
                console.warn(`   ⚠️ ${u.email}: ${error.message}`);
            } else {
                console.log(`   ✓ ${u.email} synced.`);
            }
        }

        console.log('\n📊 Patching Schema & Seeding Public Data...');
        await pgClient.connect();

        // 1. Base Seed (RE-FIXED in file)
        const baseSeed = fs.readFileSync(path.join(__dirname, '../db/v6_enterprise_seed.sql'), 'utf8');
        await pgClient.query(baseSeed);
        console.log('   ✓ Base Enterprise Seed applied.');

        // 2. Schema Patch
        await pgClient.query(`
            DO $$ 
            BEGIN 
                IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='diagnostic_sessions' AND column_name='is_completed') THEN
                    ALTER TABLE public.diagnostic_sessions ADD COLUMN is_completed BOOLEAN DEFAULT FALSE;
                END IF;
            END $$;
        `);

        // 3. Rich Sample Data
        const richData = `
            -- Sample Tickets (Diagnostic Sessions)
            INSERT INTO public.diagnostic_sessions (id, organization_id, user_id, machine_id, outcome, is_completed, created_at) VALUES
            (gen_random_uuid(), '00000000-0000-0000-0000-000000000003', '66666666-6666-6666-6666-666666666666', 'b1111111-1111-1111-1111-111111111111', 'Hydraulic leak on main arm - Needs seal kit', false, now() - interval '2 hours'),
            (gen_random_uuid(), '00000000-0000-0000-0000-000000000003', '66666666-6666-6666-6666-666666666666', 'b2222222-2222-2222-2222-222222222222', 'Engine overheating under load - Air filter blocked', false, now() - interval '5 hours'),
            (gen_random_uuid(), '00000000-0000-0000-0000-000000000003', '11111111-1111-1111-1111-111111111111', 'b1111111-1111-1111-1111-111111111111', 'Weekly inspection found minor wear on tracks', false, now() - interval '1 day'),
            (gen_random_uuid(), '00000000-0000-0000-0000-000000000003', '66666666-6666-6666-6666-666666666666', 'b1111111-1111-1111-1111-111111111111', 'Transmission sensor fault code E442', false, now() - interval '3 days'),
            (gen_random_uuid(), '00000000-0000-0000-0000-000000000003', '66666666-6666-6666-6666-666666666666', 'b2222222-2222-2222-2222-222222222222', 'Scheduled 1000h Service', false, now() - interval '4 days');

            -- Sample RFQs (Part Requests)
            INSERT INTO public.part_requests (id, organization_id, machine_id, requester_user_id, status, created_at) VALUES
            (gen_random_uuid(), '00000000-0000-0000-0000-000000000003', 'b1111111-1111-1111-1111-111111111111', '66666666-6666-6666-6666-666666666666', 'PENDING_APPROVAL', now() - interval '1 hour'),
            (gen_random_uuid(), '00000000-0000-0000-0000-000000000003', 'b2222222-2222-2222-2222-222222222222', '11111111-1111-1111-1111-111111111111', 'PENDING', now() - interval '3 hours'),
            (gen_random_uuid(), '00000000-0000-0000-0000-000000000003', 'b1111111-1111-1111-1111-111111111111', '11111111-1111-1111-1111-111111111111', 'DRAFT', now() - interval '6 hours');
        `;
        await pgClient.query(richData);
        console.log('   ✓ Rich operational data added.');

    } catch (e) {
        console.error('❌ SEED ERROR:', e.message);
    } finally {
        await pgClient.end();
        console.log('\n🏁 Seeding Sequence Complete.');
    }
}

finalSeed();
