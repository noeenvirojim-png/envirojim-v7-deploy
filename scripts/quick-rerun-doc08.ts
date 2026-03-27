import { MachineIngestionService } from "../src/lib/machines/intelligence/MachineIngestionService";
import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";
import path from "path";

dotenv.config({ path: path.resolve(__dirname, "../.env.local") });

const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
const DOC08="9db5b13e-190b-423f-b0b9-06d8811593b2";
const VB750="30000000-0000-0000-0000-111111111111";
const ORG="30000000-0000-0000-0000-000000000000";
const USR="21206e89-612e-4d7e-8d23-52a976fbe271";

async function go() {
  // Reset doc08
  await sb.from("machine_documents").update({processing_status:"parsing"}).eq("id",DOC08);
  
  // Create run
  const {data:run}=await sb.from("machine_ingestion_runs").insert({
    machine_id:VB750,organization_id:ORG,started_by:USR,status:"running",
    current_phase:"EXTRACT",total_documents:1,processed_documents:0,
    successful_documents:0,failed_documents:0
  }).select("id").single();
  
  console.log("Extracting Doc08...");
  const svc=new MachineIngestionService(process.env.GEMINI_API_KEY!);
  
  try{
    await svc.runAllDocumentExtracts(run!.id);
    console.log("✓ Extraction done");
    
    await svc.runConsolidation(run!.id);
    console.log("✓ Consolidation done");
  }catch(e){
    console.error("Failed:",(e as Error).message.substring(0,200));
    process.exit(1);
  }
  
  // Check DB
  const {data:ents}=await sb.from("machine_kb_entities").select("entity_type").eq("machine_id",VB750);
  const byType: Record<string,number>={};
  for(const e of ents||[]){byType[e.entity_type]=(byType[e.entity_type]||0)+1;}
  
  console.log("\nFinal state:");
  console.log(`  maintenance_task: ${byType.maintenance_task||0}`);
  console.log(`  fault_case: ${byType.fault_case||0}`);
  console.log(`  system: ${byType.system||0}`);
  
  process.exit(0);
}

go().catch(e=>{console.error("BLOCKED:",(e as Error).message);process.exit(1);});
