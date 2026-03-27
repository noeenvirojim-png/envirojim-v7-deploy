const {createClient}=require("@supabase/supabase-js");
const fs=require("fs"),path=require("path");
function loadEnv(f){const e={};if(fs.existsSync(f)){fs.readFileSync(f,"utf8").split("\n").forEach(l=>{const m=l.match(/^([^=]+)=(.+)$/);if(m)e[m[1].trim()]=m[2].trim();});} return e;}
const env=loadEnv(path.join(__dirname,"../.env.local"));
const sb=createClient(env.NEXT_PUBLIC_SUPABASE_URL,env.SUPABASE_SERVICE_ROLE_KEY);
const VB750="30000000-0000-0000-0000-111111111111";

async function verify(){
  const {data:ents}=await sb.from("machine_kb_entities").select("entity_type").eq("machine_id",VB750);
  const {data:docs}=await sb.from("machine_documents").select("id").eq("machine_id",VB750).eq("processing_status","completed");
  const {data:evid}=await sb.from("machine_kb_evidence").select("id").eq("machine_id",VB750);
  
  const byType={};for(const e of ents||[]){byType[e.entity_type]=(byType[e.entity_type]||0)+1;}
  
  console.log("SOURCE STATE:");
  console.log(`  Entities: ${ents?.length||0} (expected 233)`);
  console.log(`    part: ${byType.part||0}`);
  console.log(`    maintenance_task: ${byType.maintenance_task||0}`);
  console.log(`    fault_case: ${byType.fault_case||0}`);
  console.log(`    system: ${byType.system||0}`);
  console.log(`  Docs (completed): ${docs?.length||0}`);
  console.log(`  Evidence: ${evid?.length||0}`);
  
  process.exit(0);
}

verify();
