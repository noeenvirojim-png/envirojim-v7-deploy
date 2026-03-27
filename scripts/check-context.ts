import dotenv from "dotenv";
dotenv.config({ path: "../.env" });
import { createAdminClient } from "../src/lib/supabase/admin";

async function run() {
  const s = createAdminClient();
  const { data: orgs } = await s.from("organizations").select("id");
  const { data: machines } = await s.from("machines").select("id");
  const { data: users } = await s.from("users").select("id");
  const { data: docs } = await s.from("machine_documents").select("id, filename");
  
  console.log("ORGS:", orgs?.length || 0);
  console.log("MACHINES:", machines?.length || 0);
  console.log("USERS:", users?.length || 0);
  console.log("DOCS:", docs || []);
}

run();
