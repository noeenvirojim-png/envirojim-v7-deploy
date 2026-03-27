// ============================================================================
// Automated Supabase Schema Deployment Script
// ============================================================================
// Deploys DEPLOY_V6_ULTIMATE.sql to Supabase automatically
// ============================================================================

require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
    console.error('❌ Missing environment variables!');
    console.error('   NEXT_PUBLIC_SUPABASE_URL:', !!supabaseUrl);
    console.error('   SUPABASE_SERVICE_ROLE_KEY:', !!serviceRoleKey);
    process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceRoleKey);

async function deploySchema() {
    console.log('🚀 Starting Supabase schema deployment...\n');

    // Read SQL file
    const sqlPath = path.join(__dirname, 'DEPLOY_V6_ULTIMATE.sql');
    console.log('📄 Reading SQL file:', sqlPath);

    const sql = fs.readFileSync(sqlPath, 'utf8');
    console.log('✅ SQL file loaded (' + sql.length + ' bytes)\n');

    // Execute SQL
    console.log('⚙️  Executing SQL in Supabase...');
    console.log('   (This may take 30-60 seconds)\n');

    const { data, error } = await supabase.rpc('exec_sql', { sql_query: sql });

    if (error) {
        console.error('❌ Deployment failed:', error.message);
        console.error('   Code:', error.code);
        console.error('   Details:', error.details);
        console.error('   Hint:', error.hint);
        process.exit(1);
    }

    console.log('✅ Schema deployed successfully!\n');

    // Verify deployment
    console.log('🔍 Verifying deployment...\n');

    // Check tables
    const { data: tables, error: tablesError } = await supabase
        .from('information_schema.tables')
        .select('table_name')
        .eq('table_schema', 'public');

    if (tablesError) {
        console.warn('⚠️  Could not verify tables:', tablesError.message);
    } else {
        console.log('✅ Tables created:', tables.length);
    }

    // Check users
    const { data: users, error: usersError } = await supabase
        .from('users')
        .select('email, role');

    if (usersError) {
        console.warn('⚠️  Could not verify users:', usersError.message);
    } else {
        console.log('✅ Production users:');
        users.forEach(u => console.log('   -', u.email, '(' + u.role + ')'));
    }

    // Check RLS policy
    const { data: policies, error: policiesError } = await supabase.rpc('get_policies');

    if (policiesError) {
        console.warn('⚠️  Could not verify RLS policies');
    } else {
        const userReadPolicy = policies.find(p => p.tablename === 'users' && p.policyname === 'user_read');
        if (userReadPolicy) {
            console.log('✅ RLS policy "user_read" exists');
            console.log('   Contains "id = auth.uid()":', userReadPolicy.qual.includes('id = auth.uid()'));
        }
    }

    console.log('\n🎉 Deployment complete!');
    console.log('\nNext steps:');
    console.log('1. Run: node db/setup-auth-users.js');
    console.log('2. Run: node db/test-auth-bridge.js');
    console.log('3. Test login at http://localhost:3000');
}

deploySchema().catch(error => {
    console.error('💥 Unexpected error:', error);
    process.exit(1);
});
