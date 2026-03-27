import dotenv from "dotenv";
dotenv.config({ path: "../.env" });
import { createAdminClient } from "../src/lib/supabase/admin";

async function run() {
  const s = createAdminClient();
  
  const { data: policies, error } = await s.rpc('get_policies'); // If exists
  if (error) {
     // fallback to manual query if possible
     const { data: p2 } = await s.from('organizations').select('*').limit(0);
     console.log("Basic select from organizations works (admin bypass test)");
  } else {
     console.log("POLICIES:", policies);
  }
}

run().catch(console.error);
