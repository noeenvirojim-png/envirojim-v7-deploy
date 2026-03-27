const { Client } = require('pg');
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: '.env.local' });
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0'; // Bypass SSL for local dev behind proxy

// FORCE USE OF SSL for Supabase Transaction Mode
const client = new Client({
    connectionString: process.env.POSTGRES_URL || process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});

const ARTIFACTS_DIR = 'C:\\Users\\noeev\\.gemini\\antigravity\\brain\\e0ea66e5-c12a-4870-99c2-81b203dfd746';

async function execSQLFile(filePath) {
    console.log(`📄 Reading ${path.basename(filePath)}...`);
    const sql = fs.readFileSync(filePath, 'utf8');
    console.log(`🚀 Executing ${path.basename(filePath)}...`);
    await client.query(sql);
    console.log(`✅ ${path.basename(filePath)} applied.`);
}

async function deploy() {
    try {
        console.log('🔌 Connecting to database...');
        await client.connect();

        console.log('🔄 Starting ATOMIC Transaction...');
        await client.query('BEGIN');

        // =========================================================================
        // 0. NUCLEAR RESET (Clean Slate V6)
        // =========================================================================
        console.log('☢️  NUCLEAR RESET: Dropping public schema...');
        await client.query('DROP SCHEMA IF EXISTS public CASCADE');
        await client.query('CREATE SCHEMA public');

        // CRITICAL: Supabase Best Practice - Use 'extensions' schema
        console.log('🔧 Setting up Extensions...');
        await client.query('CREATE SCHEMA IF NOT EXISTS extensions');
        await client.query('GRANT USAGE ON SCHEMA extensions TO postgres, anon, authenticated, service_role');
        await client.query('CREATE EXTENSION IF NOT EXISTS pgcrypto SCHEMA extensions');

        // Update Search Path to find extensions
        await client.query('SET search_path TO public, extensions');

        await client.query('GRANT USAGE ON SCHEMA public TO postgres, anon, authenticated, service_role');
        await client.query('GRANT ALL ON ALL TABLES IN SCHEMA public TO postgres, anon, authenticated, service_role');
        await client.query('GRANT ALL ON ALL FUNCTIONS IN SCHEMA public TO postgres, anon, authenticated, service_role');
        await client.query('GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO postgres, anon, authenticated, service_role');
        await client.query('ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO postgres, anon, authenticated, service_role');

        // =========================================================================
        // 1. MIGRATIONS (Schema V6)
        // =========================================================================
        await execSQLFile(path.join(ARTIFACTS_DIR, '001_CORE.sql'));
        await execSQLFile(path.join(ARTIFACTS_DIR, '002_KNOWLEDGE.sql'));
        await execSQLFile(path.join(ARTIFACTS_DIR, '003_OPERATIONS.sql'));

        // =========================================================================
        // 2. SEED: HIERARCHY (The "Deep Hierarchy" Test)
        // =========================================================================
        console.log('🌱 Seeding Hierarchy...');

        // 2.1 Root: EnviroJim
        const { rows: rootRows } = await client.query(
            `INSERT INTO organizations (name, type) VALUES ($1, $2) RETURNING id`,
            ['EnviroJim HQ', 'ENVIROJIM']
        );
        const rootId = rootRows[0].id;
        console.log(`   └─ Root Org: ${rootId}`);

        // 2.2 Super Admin User (Linked to Root & Auth)
        const superAdminId = '00000000-0000-0000-0000-000000000001';
        const superAdminEmail = 'superadmin@envirojim.com';

        // Seed auth.users first for FK integrity
        // NOTA BENE: calls to crypt() and gen_salt() are now unqualified (relying on search_path)
        await client.query(
            `INSERT INTO auth.users (id, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, aud, role)
             VALUES ($1, $2, crypt('password123', gen_salt('bf')), NOW(), '{"provider":"email","providers":["email"]}', '{}', 'authenticated', 'authenticated')
             ON CONFLICT (id) DO NOTHING`,
            [superAdminId, superAdminEmail]
        );

        await client.query(
            `INSERT INTO users (id, email, full_name, role, org_id) 
             VALUES ($1, $2, $3, 'SUPER_ADMIN', $4)
             ON CONFLICT (id) DO UPDATE SET org_id = EXCLUDED.org_id`,
            [superAdminId, superAdminEmail, 'Super Admin', rootId]
        );

        // 2.3 Dealer: HeavyFix Inc. (Child of Root)
        const { rows: dealerRows } = await client.query(
            `INSERT INTO organizations (name, type, parent_org_id) VALUES ($1, $2, $3) RETURNING id`,
            ['HeavyFix Inc.', 'DEALER', rootId]
        );
        const dealerId = dealerRows[0].id;
        console.log(`   └─ Dealer Org: ${dealerId} (Parent: ${rootId})`);

        // Dealer Admin User
        const dealerAdminId = '00000000-0000-0000-0000-000000000002';
        const dealerAdminEmail = 'dealer@heavyfix.com';
        await client.query(
            `INSERT INTO auth.users (id, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, aud, role)
             VALUES ($1, $2, crypt('password123', gen_salt('bf')), NOW(), '{"provider":"email","providers":["email"]}', '{}', 'authenticated', 'authenticated')
             ON CONFLICT (id) DO NOTHING`,
            [dealerAdminId, dealerAdminEmail]
        );
        await client.query(
            `INSERT INTO users (id, email, full_name, role, org_id) 
             VALUES ($1, $2, $3, 'ORG_ADMIN', $4)
             ON CONFLICT (id) DO NOTHING`,
            [dealerAdminId, dealerAdminEmail, 'Dealer Admin', dealerId]
        );

        // 2.4 Client: MegaMines (Child of Dealer)
        const { rows: clientRows } = await client.query(
            `INSERT INTO organizations (name, type, parent_org_id) VALUES ($1, $2, $3) RETURNING id`,
            ['MegaMines Ltd.', 'CLIENT', dealerId]
        );
        const clientId = clientRows[0].id;
        console.log(`   └─ Client Org: ${clientId} (Parent: ${dealerId})`);

        // =========================================================================
        // 3. SEED: ASSETS & SITES
        // =========================================================================
        console.log('🌱 Seeding Assets...');

        // 3.1 Site
        const { rows: siteRows } = await client.query(
            `INSERT INTO sites (name, organization_id) VALUES ($1, $2) RETURNING id`,
            ['North Pit', clientId]
        );
        const siteId = siteRows[0].id;

        // 3.2 Machine
        const { rows: machineRows } = await client.query(
            `INSERT INTO machines (organization_id, site_id, serial_number, make, model, year, current_hours) 
         VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING id`,
            [clientId, siteId, 'CAT-336-HEX-001', 'Caterpillar', '336 Excavator', 2022, 4500]
        );
        const machineId = machineRows[0].id;
        console.log(`   └─ Machine: ${machineId} (Owner: ${clientId})`);

        // =========================================================================
        // 4. SEED: AI & KNOWLEDGE (Readiness Proof)
        // =========================================================================
        console.log('🌱 Seeding AI Knowledge...');

        // 4.1 Manual (Simulated)
        const { rows: manualRows } = await client.query(
            `INSERT INTO manuals (organization_id, machine_id, title, file_url, processing_status) 
         VALUES ($1, $2, $3, $4, 'INDEXED') RETURNING id`,
            [rootId, null, 'CAT 336 Operations Manual', 'https://example.com/manual.pdf']
        );
        const manualId = manualRows[0].id;

        // 4.2 Maintenance Rule (Extracted from Manual)
        await client.query(
            `INSERT INTO maintenance_rules (machine_id, source_manual_id, rule_name, interval_hours, description) 
         VALUES ($1, $2, $3, $4, $5)`,
            [machineId, manualId, '500h Engine Service', 500, 'Change engine oil and filter. Check coolant level.']
        );
        console.log(`   └─ AI Rule: 500h Service linked to Manual ${manualId}`);

        // =========================================================================
        // 5. COMMIT
        // =========================================================================
        await client.query('COMMIT');
        console.log('🎉 DEPLOYMENT SUCCESSFUL! All systems go.');

    } catch (err) {
        const errorMsg = `❌ DEPLOYMENT FAILED.\n${err.stack || err.message}`;
        console.error(errorMsg);
        fs.writeFileSync('deployment_error.txt', errorMsg);
        try {
            await client.query('ROLLBACK');
        } catch (e) { console.error('Rollback failed:', e); }
        process.exit(1);
    } finally {
        await client.end();
    }
}

deploy();
