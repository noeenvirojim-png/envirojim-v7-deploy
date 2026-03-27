import dotenv from "dotenv";
dotenv.config({ path: "../.env" });

async function run() {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error("Missing AIza key");
  
  const url = `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`;
  const response = await fetch(url);
  const data = await response.json();
  
  const m = data.models.filter((m: any) => m.name.includes("8b"));
  console.log("8B_MODELS:", JSON.stringify(m, null, 2));
}

run();
