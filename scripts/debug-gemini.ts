import { GoogleGenerativeAI } from "@google/generative-ai";

async function run() {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error("Missing Key");
  
  const genAI = new GoogleGenerativeAI(apiKey);
  const models = ["gemini-1.5-flash", "gemini-1.5-pro", "gemini-pro"];
  
  for (const m of models) {
    console.log(`Testing model: ${m}...`);
    try {
      const model = genAI.getGenerativeModel({ model: m });
      const result = await model.generateContent("Hello?");
      console.log(`[OK] ${m}: ${result.response.text()}`);
      break;
    } catch (err: any) {
      console.error(`[FAIL] ${m}: ${err.message}`);
    }
  }
}

run();
