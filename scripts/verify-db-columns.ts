
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

// Load env
dotenv.config({ path: path.join(process.cwd(), '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error('Missing Supabase credentials in .env.local');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

const CRITICAL_CHECKS = [
    { table: 'users', column: 'organization_id' },
    { table: 'part_requests', column: 'status' }, // request_status enum usage
    { table: 'diagnostic_sessions', column: 'outcome' },
    // { table: 'checklists', column: 'checklist_type' }, // REMOVED: Managed in code via default
    { table: 'diagnostic_nodes', column: 'outcome_type' }
];

async function checkColumns() {
    console.log('Verifying critical DB columns...');
    let hasError = false;

    for (const check of CRITICAL_CHECKS) {
        // We can't query information_schema easily via JS client without strict permissions or rpc
        // simpler way: try to select the column from the table with limit 1
        const { error } = await supabase
            .from(check.table)
            .select(check.column)
            .limit(1);

        if (error) {
            console.error(`[FAIL] Column ${check.table}.${check.column} NOT FOUND or Inaccessible. Error: ${error.message}`);
            hasError = true;
        } else {
            console.log(`[PASS] Column ${check.table}.${check.column} exists.`);
        }
    }

    if (hasError) {
        console.error('Schema verification FAILED.');
        process.exit(1);
    } else {
        console.log('Schema verification PASSED.');
        process.exit(0);
    }
}

checkColumns();
