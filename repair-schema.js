const {createClient}=require('@supabase/supabase-js');
const fs=require('fs');

(async()=>{
const s=createClient('http://127.0.0.1:55321','eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.ENRFwDnwh8TYL14sws85HmY19NZlgdXyC6LKSuDLma0');

try{
console.log('[PHASE 2] SCHEMA REPAIR\n');

// Extract SQL from migration file
const migContent=fs.readFileSync('supabase/migrations/20260305000000_v9_supreme_build.sql','utf-8');

// Execute migrations via RPC or direct connection
const{error:execErr}=await s.rpc('exec_sql',{query:migContent});
if(execErr){
  console.log('RPC exec failed, attempting alternative approach...\n');
  console.log('Migrations in file: 20260305000000_v9_supreme_build.sql');
  console.log('Status: Cannot auto-execute; requires Supabase CLI or manual DB access\n');
  console.log('[VERDICT]\n');
  console.log('✗ Schema repair blocked: no RPC or CLI access to apply migrations');
}else{
  console.log('✓ Migration executed successfully\n');
}

}catch(e){
console.error('Error:',e.message);
}
})()
