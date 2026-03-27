import dotenv from "dotenv";
dotenv.config({ path: "../.env" });
import { createAdminClient } from "../src/lib/supabase/admin";

async function run() {
  const s = createAdminClient();
  const { data, error } = await s.storage.listBuckets();
  if (error) {
    console.error(error.message);
  } else {
    console.log("BUCKETS:", data.map(b => b.name));
  }
}

run();
