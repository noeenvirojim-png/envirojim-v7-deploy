import dotenv from "dotenv";
dotenv.config({ path: "../.env" });
import { createAdminClient } from "../src/lib/supabase/admin";

async function run() {
  const s = createAdminClient();
  
  // Try to insert with a different name
  console.log("Attempting insert with minimalist payload...");
  const { data: org, error: orgError } = await s.from("organizations").insert({
    name: "Minimal Org"
  }).select("id").single();
  
  if (orgError) {
      console.log("INSERT_ERROR:", orgError.message);
      console.log("ERROR_CODE:", orgError.code);
  } else {
      console.log("Org created successfully:", org.id);
  }
}

run().catch(console.error);
