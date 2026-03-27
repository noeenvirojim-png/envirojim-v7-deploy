
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '../.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
        autoRefreshToken: false,
        persistSession: false
    }
});

const ADMIN_EMAIL = 'noe@envirojim.com';
const SYSTEM_ORG_ID = '00000000-0000-0000-0000-000000000001';

async function repairIdentity() {
    console.log('--- IDENTITY REPAIR SYSTEM (V6) ---');

    // 1. Fetch all users from both layers
    const { data: { users: authUsers }, error: authError } = await supabase.auth.admin.listUsers();
    if (authError) throw authError;

    const { data: publicUsers, error: publicError } = await supabase
        .from('users')
        .select('*');
    if (publicError) throw publicError;

    console.log(`Found ${authUsers.length} auth users and ${publicUsers?.length || 0} public users.`);

    for (const authUser of authUsers) {
        const publicUser = publicUsers?.find((u: any) => u.id === authUser.id);
        
        // Use the identity from public.users as Truth, unless it's Noe
        let targetRole = publicUser?.role || authUser.app_metadata?.role || 'OPERATOR';
        let targetOrg = publicUser?.organization_id || authUser.app_metadata?.organization_id || 'NO_ORG';

        // FORCE ADMIN CONSTANTS
        if (authUser.email === ADMIN_EMAIL) {
            targetRole = 'ENVIROJIM_ADMIN';
            targetOrg = SYSTEM_ORG_ID;
            console.log(`[ADMINFORCE] Ensuring ${ADMIN_EMAIL} is ${targetRole} in ${targetOrg}`);
        }

        const currentRole = authUser.app_metadata?.role;
        const currentOrg = authUser.app_metadata?.organization_id;

        if (currentRole !== targetRole || currentOrg !== targetOrg) {
            console.log(`[DRIFT] User ${authUser.email}: Role(${currentRole}->${targetRole}) Org(${currentOrg}->${targetOrg})`);
            
            // Repair Auth Metadata
            const { error: updateError } = await supabase.auth.admin.updateUserById(authUser.id, {
                app_metadata: { 
                    role: targetRole, 
                    organization_id: targetOrg,
                    org_id: targetOrg // legacy support
                }
            });

            if (updateError) {
                console.error(`   ❌ Failed to update Auth for ${authUser.email}:`, updateError.message);
            } else {
                console.log(`   ✅ Auth updated.`);
            }

            // Repair Public Table if exists
            if (publicUser) {
                const { error: dbUpdateError } = await supabase
                    .from('users')
                    .update({ 
                        role: targetRole, 
                        organization_id: targetOrg 
                    })
                    .eq('id', authUser.id);
                
                if (dbUpdateError) {
                    console.error(`   ❌ Failed to update Public DB for ${authUser.email}:`, dbUpdateError.message);
                } else {
                    console.log(`   ✅ Public DB updated.`);
                }
            } else {
                // User exists in auth but missing in public
                console.log(`   ⚠️  User missing in public.users. Creating record...`);
                const { error: createError } = await supabase
                    .from('users')
                    .insert({
                        id: authUser.id,
                        email: authUser.email,
                        role: targetRole,
                        organization_id: targetOrg,
                        full_name: authUser.user_metadata?.full_name || authUser.email
                    });
                
                if (createError) {
                    console.error(`   ❌ Failed to create public user record:`, createError.message);
                } else {
                    console.log(`   ✅ public.users record created.`);
                }
            }
        } else {
            // Check if public record is missing even if metadata is correct
            if (!publicUser) {
                 console.log(`[SYNC] User ${authUser.email} metadata OK but missing in DB. Recreating...`);
                 await supabase.from('users').insert({
                    id: authUser.id,
                    email: authUser.email,
                    role: targetRole,
                    organization_id: targetOrg,
                    full_name: authUser.user_metadata?.full_name || authUser.email
                });
            }
        }
    }

    // 2. Final check for users in public but not in auth
    for (const pUser of (publicUsers || [])) {
        if (!authUsers.find((au: any) => au.id === pUser.id)) {
            console.warn(`[ORPHAN] User ${pUser.email} (${pUser.id}) exists in DB but NOT in Supabase Auth.`);
        }
    }

    console.log('\n✅ IDENTITY REPAIR COMPLETED.');
}

repairIdentity().catch(err => {
    console.error('FATAL REPAIR ERROR:', err);
    process.exit(1);
});
