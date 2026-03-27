const {createClient}=require("@supabase/supabase-js");
const fs=require("fs"),path=require("path");
function loadEnv(f){const e={};fs.existsSync(f)&&fs.readFileSync(f,"utf8").split("\n").forEach(l=>{const m=l.match(/^([^=]+)=(.+)$/);m&&(e[m[1].trim()]=m[2].trim());});return e;}
const env=loadEnv(path.join(__dirname,"../.env.local"));
const sb=createClient(env.NEXT_PUBLIC_SUPABASE_URL,env.SUPABASE_SERVICE_ROLE_KEY);

async function check(){
  const tables=['canonical_clusters','canonical_cluster_aliases','canonical_cluster_members','canonical_cluster_links','canonical_fusion_runs'];
  
  for(const tbl of tables){
    const {error}=await sb.from(tbl).select("*").limit(0);
    if(error){
      console.log(`✗ ${tbl}: ${error.message}`);
    }else{
      console.log(`✓ ${tbl}`);
    }
  }
  
  process.exit(0);
}

check();
