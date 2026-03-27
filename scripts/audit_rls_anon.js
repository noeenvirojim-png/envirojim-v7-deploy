
const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
dotenv.config({ path: '.env.local' });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function checkPolicies() {
    console.log('--- RLS Policy Audit ---');
    // Note: We cannot query pg_policies directly via supabase-js unless exposed via Rpc/Function.
    // Instead, we will try to fetch data as an ANONYMOUS user (simulating public access/client side).

    const publicClient = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

    const tables = ['tickets', 'users', 'machines'];

    for (const table of tables) {
        const { count, error } = await publicClient.from(table).select('*', { count: 'exact', head: true });
        if (error) {
            console.log(`⚠️  Public/Anon Access to ${table}: DENIED / ERROR (${error.message})`);
        } else {
            console.log(`ℹ️  Public/Anon Access to ${table}: See ${count} rows`);
        }
    }
}
checkPolicies();
