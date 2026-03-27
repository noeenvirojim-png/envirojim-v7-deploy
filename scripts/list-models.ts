import dotenv from "dotenv";
dotenv.config({ path: "../.env" });

async function run() {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error("Missing AIza key");
  
  const url = `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`;
  const response = await fetch(url);
  const data = await response.json();
  
  const topModels = data.models.slice(0, 30).map((m: any) => ({
    name: m.name,
    displayName: m.displayName,
    supportedGenerationMethods: m.supportedGenerationMethods
  }));
  
  console.log("TOP_MODELS:", JSON.stringify(topModels, null, 2));
}

run();
