
const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: '.env.local' });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function checkData() {
    console.log('--- Database Content Audit ---');

    const tables = ['users', 'tickets', 'machines', 'organizations', 'clients'];

    for (const table of tables) {
        const { count, error } = await supabase.from(table).select('*', { count: 'exact', head: true });
        if (error) {
            console.error(`❌ Error checking ${table}:`, error.message);
        } else {
            console.log(`✅ ${table}: ${count} rows`);
        }
    }

    console.log('\n--- Checking Recent Tickets ---');
    const { data: tickets, error: ticketError } = await supabase.from('tickets').select('id, title, status').limit(5);
    if (ticketError) console.error(ticketError);
    else tickets.forEach(t => console.log(` - ${t.id}: ${t.title} [${t.status}]`));

    console.log('\n--- Checking Users (Techs) ---');
    const { data: users, error: userError } = await supabase.from('users').select('id, email, role').limit(5);
    if (userError) console.error(userError);
    else users.forEach(u => console.log(` - ${u.id}: ${u.email} [${u.role}]`));
}

checkData();
