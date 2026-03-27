const { createClient } = require("@supabase/supabase-js");
const fs = require("fs");
const path = require("path");

function loadEnv(filePath) {
  const env = {};
  if (fs.existsSync(filePath)) {
    const content = fs.readFileSync(filePath, "utf8");
    const lines = content.split("\n");
    for (const line of lines) {
      const match = line.match(/^([^=]+)=(.+)$/);
      if (match) {
        env[match[1].trim()] = match[2].trim();
      }
    }
  }
  return env;
}

const envPath = path.join(__dirname, "../.env.local");
const env = loadEnv(envPath);

const SUPABASE_URL = env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

async function getUserId() {
  const { data: users } = await supabase
    .from("users")
    .select("id, email")
    .limit(5);

  console.log("Users in database:");
  for (const u of (users || [])) {
    console.log(`  - ${u.id}: ${u.email}`);
  }

  if ((users || []).length > 0) {
    console.log(`\nUse this ID: ${users[0].id}`);
  }

  process.exit(0);
}

getUserId();
