const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env.local') });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function applyMigrations() {
    console.log('Applying migrations via RPC...');
    const dbDir = path.resolve(__dirname, '../db');
    const sql1 = fs.readFileSync(path.join(dbDir, 'MIGRATION_V8_AI_GUIDANCE_ULTRA.sql'), 'utf8');
    const { error: error1 } = await supabase.rpc('exec_sql', { sql_query: sql1 });
    if (error1) console.error('Error 1:', error1);
    else console.log('V8 AI Guidance Applied');

    const sql2 = fs.readFileSync(path.join(dbDir, 'MIGRATION_V8_CLIENT_ONBOARDING.sql'), 'utf8');
    const { error: error2 } = await supabase.rpc('exec_sql', { sql_query: sql2 });
    if (error2) console.error('Error 2:', error2);
    else console.log('V8 Client Onboarding Applied');
}

applyMigrations().catch(console.error);
