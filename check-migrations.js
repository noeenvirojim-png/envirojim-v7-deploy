const {createClient}=require('@supabase/supabase-js');
(async()=>{
const s=createClient('http://127.0.0.1:55321','eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.ENRFwDnwh8TYL14sws85HmY19NZlgdXyC6LKSuDLma0');
try{
console.log('[Check applied migrations]\n');
const{data:mig}=await s.from('_supabase_migrations').select('*').catch(()=>({data:null}));
if(mig){
console.log('Applied migrations:',mig.length);
mig.slice(0,3).forEach(m=>console.log('  ',m.name));
}else{
console.log('_supabase_migrations table not found\n');
}
const{data:tables}=await s.from('information_schema.tables').select('table_name').eq('table_schema','public').catch(()=>({data:null}));
if(tables){
console.log('\nPublic tables:');
tables.forEach(t=>console.log('  ',t.table_name));
}else{
console.log('\nCannot query tables');
}
}catch(e){console.error('Error:',e.message)}
})()
