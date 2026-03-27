
const { createClient } = require('@supabase/supabase-js');
const { Client } = require('pg');
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: '.env.local' });

process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

async function seedComplete() {
    console.log('🌱 Starting V6 Enterprise Data Sync...');

    const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL,
        process.env.SUPABASE_SERVICE_ROLE_KEY
    );

    const users = [
        { id: '11111111-1111-1111-1111-111111111111', email: 'noe@envirojim.com', role: 'SUPER_ADMIN', name: 'Noe Admin' },
        { id: '22222222-2222-2222-2222-222222222222', email: 'parts@envirojim.com', role: 'SUPPORT_ADMIN', name: 'Support Specialist' },
        { id: '33333333-3333-3333-3333-333333333333', email: 'manager@acmemining.com', role: 'ORG_ADMIN', name: 'Mike Manager' },
        { id: '44444444-4444-4444-4444-444444444444', email: 'operator@acmemining.com', role: 'OPERATOR', name: 'Tom Operator' },
        { id: '55555555-5555-5555-5555-555555555555', email: 'admin@northernsp.com', role: 'ORG_ADMIN', name: 'Nancy Admin' },
        { id: '66666666-6666-6666-6666-666666666666', email: 'tech@northernsp.com', role: 'TECHNICIAN', name: 'Terry Technician' }
    ];

    try {
        console.log('\n📋 STEP 1: Syncing Auth Users...');
        const { data: { users: authUsers }, error: listError } = await supabase.auth.admin.listUsers();
        if (listError) throw listError;

        for (const u of users) {
            const found = authUsers.find(ex => ex.email.toLowerCase() === u.email.toLowerCase());
            if (found && found.id !== u.id) {
                await supabase.auth.admin.deleteUser(found.id);
            }
            await supabase.auth.admin.createUser({
                id: u.id,
                email: u.email,
                password: 'password123',
                email_confirm: true,
                user_metadata: { full_name: u.name }
            }).catch(() => { });
            console.log(`   ✓ ${u.email}`);
        }

        console.log('\n📋 STEP 2: Executing Database Blocks...');
        const client = new Client({
            connectionString: process.env.POSTGRES_URL,
            ssl: { rejectUnauthorized: false }
        });
        await client.connect();

        const seedPath = path.join(__dirname, '../db/v6_enterprise_seed.sql');
        const sql = fs.readFileSync(seedPath, 'utf8');

        // Remove comments more safely
        const cleanSql = sql.replace(/--.*$/gm, '');
        const statements = cleanSql.split(';').map(s => s.trim()).filter(s => s.length > 5);

        console.log(`   Found ${statements.length} SQL statements in ${seedPath}`);

        for (const stmt of statements) {
            try {
                await client.query(stmt);
            } catch (sqle) {
                if (!sqle.message.includes('already exists')) {
                    console.warn(`   ⚠️ Block error: ${sqle.message.substring(0, 50)}`);
                }
            }
        }

        await client.end();
        console.log('   ✓ Schema data seeded.');

    } catch (err) {
        console.error('❌ SEED ERROR:', err);
    } finally {
        console.log('\n✅ Done.');
    }
}

seedComplete();
