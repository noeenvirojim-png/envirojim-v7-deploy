
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function fixOrgs() {
    // 1. Get or Create Organization
    let { data: orgs } = await supabase.from('organizations').select('*').eq('name', 'Acme Mining Co.');
    let orgId;

    if (!orgs || orgs.length === 0) {
        console.log('Creating Acme Mining Co...');
        const { data: newOrg, error } = await supabase.from('organizations').insert({
            name: 'Acme Mining Co.',
            type: 'CLIENT'
        }).select().single();
        if (error) {
            console.error('Error creating org:', error.message);
            // Fallback to first org
            const { data: allOrgs } = await supabase.from('organizations').select('id').limit(1);
            if (allOrgs && allOrgs.length > 0) orgId = allOrgs[0].id;
            else { console.error('No orgs available!'); return; }
        } else {
            orgId = newOrg.id;
        }
    } else {
        orgId = orgs[0].id;
    }

    console.log(`Using Org ID: ${orgId}`);

    // 2. Assign Users to this Org
    const emails = ['manager@acmemining.com', 'operator@acmemining.com'];
    for (const email of emails) {
        console.log(`Assigning ${email} to ${orgId}...`);
        const { error } = await supabase.from('users').update({ organization_id: orgId }).eq('email', email);
        if (error) console.error(`Error updating ${email}:`, error.message);
        else console.log('Success.');
    }

    // 3. Assign Machine to this Org (if exists)
    // We seeded one machine earlier with dynamic org ID. Let's make sure it matches.
    // Or just update ALL machines to this org for simplicity in test env.
    console.log('Updating all machines to this org...');
    const { error: machineError } = await supabase.from('machines').update({ organization_id: orgId }).neq('organization_id', orgId);
    if (machineError) console.error('Error updating machines:', machineError.message);
    else console.log('Machines updated.');
}

fixOrgs();
