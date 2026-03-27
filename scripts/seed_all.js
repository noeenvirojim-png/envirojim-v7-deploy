const path = require('path');
const fs = require('fs');
const { createClient } = require('@supabase/supabase-js');
const envPath = path.resolve(__dirname, '..', '.env.local');
if (!fs.existsSync(envPath)) {
    console.error('❌ ERROR: .env.local not found at:', envPath);
    process.exit(1);
}
require('dotenv').config({ path: envPath });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

console.log('DEBUG: Environment loaded from:', envPath);
console.log('DEBUG: Supabase URL:', supabaseUrl);
console.log('DEBUG: Service Key (first 10):', supabaseServiceKey ? supabaseServiceKey.substring(0, 10) : 'MISSING');

const ADMIN_USER = {
    email: 'noe@envirojim.com',
    password: 'EnviroJim2024!',
    full_name: 'Noe Admin',
    role: 'SUPER_ADMIN'
};

async function seedDatabase() {
    console.log('╔════════════════════════════════════════════════════════════════╗');
    console.log('║  ENVIROJIM PLATFORM - DATABASE SEEDING                         ║');
    console.log('╚════════════════════════════════════════════════════════════════╝\n');

    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
        auth: {
            autoRefreshToken: false,
            persistSession: false
        }
    });

    try {
        // ====================================================================
        // STEP 1: Create Admin User in auth.users
        // ====================================================================
        console.log('📋 STEP 1: Creating admin user in auth.users...');

        // Check if user already exists
        const { data: existingUsers } = await supabase.auth.admin.listUsers();
        let adminUser = existingUsers?.users?.find(u => u.email === ADMIN_USER.email);

        if (adminUser) {
            console.log(`   ✓ Admin user already exists in auth.users`);
            console.log(`   User ID: ${adminUser.id}\n`);
        } else {
            const { data: authData, error: authError } = await supabase.auth.admin.createUser({
                email: ADMIN_USER.email,
                password: ADMIN_USER.password,
                email_confirm: true,
                user_metadata: {
                    full_name: ADMIN_USER.full_name
                }
            });

            if (authError) {
                throw new Error(`Failed to create admin in auth.users: ${authError.message}`);
            }

            adminUser = authData.user;
            console.log(`   ✓ Created admin user in auth.users`);
            console.log(`   User ID: ${adminUser.id}\n`);
        }

        const adminUserId = adminUser.id;

        // ====================================================================
        // STEP 2: Insert Admin into public.users
        // ====================================================================
        console.log('📋 STEP 2: Inserting admin into public.users...');

        const { data: existingPublicUser } = await supabase
            .from('users')
            .select('*')
            .eq('id', adminUserId)
            .single();

        if (existingPublicUser) {
            console.log(`   ✓ Admin already exists in public.users\n`);
        } else {
            const { error: insertUserError } = await supabase
                .from('users')
                .insert({
                    id: adminUserId,
                    email: ADMIN_USER.email,
                    full_name: ADMIN_USER.full_name,
                    role: ADMIN_USER.role,
                    organization_id: null // Will be set after creating organization
                });

            if (insertUserError) {
                throw new Error(`Failed to insert admin into public.users: ${insertUserError.message}`);
            }

            console.log(`   ✓ Inserted admin into public.users\n`);
        }

        // ====================================================================
        // STEP 3: Create Organization
        // ====================================================================
        console.log('📋 STEP 3: Creating organization...');

        const { data: existingOrgs } = await supabase
            .from('organizations')
            .select('*')
            .eq('name', 'EnviroJim HQ');

        let organization;
        if (existingOrgs && existingOrgs.length > 0) {
            organization = existingOrgs[0];
            console.log(`   ✓ Organization already exists`);
            console.log(`   Org ID: ${organization.id}\n`);
        } else {
            const { data: newOrg, error: orgError } = await supabase
                .from('organizations')
                .insert({
                    name: 'EnviroJim HQ'
                })
                .select()
                .single();

            if (orgError) {
                throw new Error(`Failed to create organization: ${orgError.message}`);
            }

            organization = newOrg;
            console.log(`   ✓ Created organization: ${organization.name}`);
            console.log(`   Org ID: ${organization.id}\n`);
        }

        // Update admin user's org_id
        const { error: updateUserError } = await supabase
            .from('users')
            .update({ organization_id: organization.id })
            .eq('id', adminUserId);

        if (updateUserError) {
            throw new Error(`Failed to update admin org_id: ${updateUserError.message}`);
        }

        console.log(`   ✓ Updated admin user org_id\n`);

        // ====================================================================
        // STEP 4: Create Machines
        // ====================================================================
        console.log('📋 STEP 4: Creating machines...');

        const machinesData = [
            {
                serial_number: 'XC-900-2023-001',
                manufacturer: 'Caterpillar',
                brand: 'Caterpillar',
                model: 'XC-900',
                year: 2023,
                location: 'Site A - North Pit',
                organization_id: organization.id
            },
            {
                serial_number: 'HD-785-2022-042',
                manufacturer: 'Komatsu',
                brand: 'Komatsu',
                model: 'HD-785',
                year: 2022,
                location: 'Site B - South Quarry',
                organization_id: organization.id
            },
            {
                serial_number: 'D11T-2021-128',
                manufacturer: 'Caterpillar',
                brand: 'Caterpillar',
                model: 'D11T',
                year: 2021,
                location: 'Site C - East Mine',
                organization_id: organization.id
            }
        ];

        const machines = [];
        for (const machineData of machinesData) {
            const { data: existingMachine } = await supabase
                .from('machines')
                .select('*')
                .eq('serial_number', machineData.serial_number)
                .single();

            if (existingMachine) {
                machines.push(existingMachine);
                console.log(`   ✓ Machine already exists: ${machineData.serial_number}`);
            } else {
                const { data: newMachine, error: machineError } = await supabase
                    .from('machines')
                    .insert(machineData)
                    .select()
                    .single();

                if (machineError) {
                    throw new Error(`Failed to create machine: ${machineError.message}`);
                }

                machines.push(newMachine);
                console.log(`   ✓ Created machine: ${machineData.make} ${machineData.model}`);
            }
        }
        console.log('');

        // ====================================================================
        // STEP 5: Create Parts
        // ====================================================================
        console.log('📋 STEP 5: Creating parts...');

        const partsData = [
            // Machine 1 parts
            { name: 'Hydraulic Filter', catalog_ref: 'HF-900-A1', machine_id: machines[0].id, quantity: 5, unit_price: 45.99 },
            { name: 'Engine Oil Filter', catalog_ref: 'EOF-900-B2', machine_id: machines[0].id, quantity: 10, unit_price: 32.50 },
            // Machine 2 parts
            { name: 'Air Filter Element', catalog_ref: 'AFE-785-C3', machine_id: machines[1].id, quantity: 8, unit_price: 28.75 },
            { name: 'Fuel Filter', catalog_ref: 'FF-785-D4', machine_id: machines[1].id, quantity: 12, unit_price: 38.00 },
            // Machine 3 parts
            { name: 'Track Roller', catalog_ref: 'TR-D11T-E5', machine_id: machines[2].id, quantity: 3, unit_price: 450.00 },
            { name: 'Idler Wheel', catalog_ref: 'IW-D11T-F6', machine_id: machines[2].id, quantity: 2, unit_price: 680.00 }
        ];

        let partsCreated = 0;
        for (const partData of partsData) {
            const { data: existingPart } = await supabase
                .from('parts')
                .select('*')
                .eq('catalog_ref', partData.catalog_ref)
                .single();

            if (!existingPart) {
                const { error: partError } = await supabase
                    .from('parts')
                    .insert(partData);

                if (partError) {
                    throw new Error(`Failed to create part: ${partError.message}`);
                }

                partsCreated++;
                console.log(`   ✓ Created part: ${partData.name} (${partData.catalog_ref})`);
            }
        }

        if (partsCreated === 0) {
            console.log(`   ✓ All parts already exist`);
        }
        console.log('');

        // ====================================================================
        // STEP 6: Create Diagnostic Sessions
        // ====================================================================
        console.log('📋 STEP 6: Creating diagnostic sessions...');

        const diagnosticsData = [
            {
                machine_id: machines[0].id,
                created_by: adminUserId,
                session_type: 'STANDARD',
                result: 'Hydraulic system pressure within normal range',
                notes: 'Routine inspection completed successfully'
            },
            {
                machine_id: machines[1].id,
                created_by: adminUserId,
                session_type: 'ADVANCED',
                result: 'Engine temperature sensor requires calibration',
                notes: 'Scheduled for maintenance next week'
            },
            {
                machine_id: machines[2].id,
                created_by: adminUserId,
                session_type: 'STANDARD',
                result: 'Track tension adjusted, all systems operational',
                notes: 'No issues detected'
            }
        ];

        let diagnosticsCreated = 0;
        for (const diagData of diagnosticsData) {
            const { data: existingDiag } = await supabase
                .from('diagnostic_sessions')
                .select('*')
                .eq('machine_id', diagData.machine_id)
                .eq('created_by', adminUserId)
                .single();

            if (!existingDiag) {
                const { error: diagError } = await supabase
                    .from('diagnostic_sessions')
                    .insert(diagData);

                if (diagError) {
                    throw new Error(`Failed to create diagnostic session: ${diagError.message}`);
                }

                diagnosticsCreated++;
                console.log(`   ✓ Created diagnostic for machine: ${diagData.machine_id.substring(0, 8)}...`);
            }
        }

        if (diagnosticsCreated === 0) {
            console.log(`   ✓ All diagnostic sessions already exist`);
        }
        console.log('');

        // ====================================================================
        // STEP 7: Create Audit Logs
        // ====================================================================
        console.log('📋 STEP 7: Creating audit logs...');

        const { error: auditError } = await supabase
            .from('audit_logs')
            .insert([
                {
                    user_id: adminUserId,
                    action: 'DATABASE_SEEDED',
                    entity: 'system',
                    entity_id: null,
                    details: {
                        organizations_created: 1,
                        machines_created: machines.length,
                        parts_created: partsData.length,
                        diagnostics_created: diagnosticsData.length
                    }
                }
            ]);

        if (auditError) {
            console.log(`   ⚠️  Failed to create audit log (non-critical): ${auditError.message}`);
        } else {
            console.log(`   ✓ Created audit log entry\n`);
        }

        // ====================================================================
        // SUCCESS SUMMARY
        // ====================================================================
        console.log('╔════════════════════════════════════════════════════════════════╗');
        console.log('║  ✅ DATABASE SEEDING COMPLETE                                  ║');
        console.log('╚════════════════════════════════════════════════════════════════╝\n');

        console.log('🔑 ADMIN CREDENTIALS:');
        console.log(`   Email:    ${ADMIN_USER.email}`);
        console.log(`   Password: ${ADMIN_USER.password}`);
        console.log(`   User ID:  ${adminUserId}`);
        console.log(`   Role:     ${ADMIN_USER.role}\n`);

        console.log('🏢 ORGANIZATION:');
        console.log(`   Name:     ${organization.name}`);
        console.log(`   ID:       ${organization.id}\n`);

        console.log('🚜 MACHINES SEEDED:');
        machines.forEach((m, i) => {
            console.log(`   ${i + 1}. ${m.make} ${m.model} (${m.serial_number})`);
            console.log(`      Location: ${m.location}`);
        });
        console.log('');

        console.log('🔧 PARTS SEEDED:');
        console.log(`   Total: ${partsData.length} parts across ${machines.length} machines\n`);

        console.log('📊 DIAGNOSTICS SEEDED:');
        console.log(`   Total: ${diagnosticsData.length} diagnostic sessions\n`);

        console.log('✅ Next Steps:');
        console.log('   1. Go to http://localhost:3000/login');
        console.log('   2. Login with admin credentials above');
        console.log('   3. Verify dashboard loads with seeded data');
        console.log('   4. Run Playwright tests to verify end-to-end flow\n');

    } catch (error) {
        console.error('\n❌ SEEDING FAILED:', error.message);
        console.error('\nStack trace:', error.stack);
        process.exit(1);
    }
}

seedDatabase();
