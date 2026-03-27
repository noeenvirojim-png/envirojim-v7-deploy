import dotenv from "dotenv";
dotenv.config({ path: "../.env" });
import { createAdminClient } from "../src/lib/supabase/admin";

async function run() {
  const s = createAdminClient();
  const { data: buckets } = await s.storage.listBuckets();
  console.log("BUCKETS:", buckets?.map(b => b.name));
  
  const { data: files } = await s.storage.from("machine-documents").list("test");
  console.log("FILES IN machine-documents/test:", files || []);
  
  const { data: rootFiles } = await s.storage.from("machine-documents").list();
  console.log("FILES IN machine-documents root:", rootFiles || []);
}

run();
