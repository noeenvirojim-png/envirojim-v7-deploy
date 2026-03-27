const { createClient } = require('@supabase/supabase-js');
const path = require('path');
require('dotenv').config({ path: path.join(process.cwd(), '.env.local') });

async function checkDb() {
    const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL,
        process.env.SUPABASE_SERVICE_ROLE_KEY
    );

    console.log("--- Users ---");
    const { data: users } = await supabase.from('users').select('*').limit(5);
    console.log(users);

    console.log("--- Machines ---");
    const { data: machines } = await supabase.from('machines').select('id, serial_number, organization_id').limit(10);
    console.log(machines);

    const testSN = 'VB750-1773016309210';
    const { data: found } = await supabase.from('machines').select('id').eq('serial_number', testSN).single();
    console.log(`Lookup ${testSN}:`, found);
}

checkDb();
