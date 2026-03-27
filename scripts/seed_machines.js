
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function seedMachines() {
    // 1. Get an organization (EnviroJim or Acme)
    const { data: orgs } = await supabase.from('organizations').select('id, name').limit(1);
    if (!orgs || orgs.length === 0) {
        console.error('No organizations found. Cannot seed machines.');
        return;
    }
    const orgId = orgs[0].id;
    console.log(`Seeding machine for Org: ${orgs[0].name} (${orgId})`);

    // 2. Insert Machine
    const machine = {
        organization_id: orgId,
        serial_number: 'CAT-320D-SEED-01',
        make: 'Caterpillar',
        model: '320D',
        year: 2023,
        current_hours: 150,
        engine_make: 'Perkins',
        engine_serial: 'PERK-999'
        // deleted_at is null by default
    };

    const { data, error } = await supabase
        .from('machines')
        .insert(machine)
        .select()
        .single();

    if (error) {
        console.error('Error seeding machine:', error.message);
    } else {
        console.log(`Success! Created machine: ${data.id} (${data.serial_number})`);
    }
}

seedMachines();
