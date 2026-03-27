import dotenv from "dotenv";
dotenv.config({ path: "../.env" });
import { createAdminClient } from "../src/lib/supabase/admin";

async function run() {
  const s = createAdminClient();
  const tableName = "machines";
  
  // Use a query that returns columns
  const { data, error } = await s.from(tableName).select("*").limit(1);
  if (error) {
    console.error("SELECT ERROR:", error.message);
  } else {
    if (data && data.length > 0) {
      console.log("COLUMNS:", Object.keys(data[0]));
    } else {
      console.log("TABLE EMPTY, trying RPC or alternative...");
    }
  }
}

run();
