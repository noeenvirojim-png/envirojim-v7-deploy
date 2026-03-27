import { config } from "dotenv";
import { resolve } from "path";
import { GoogleGenerativeAI } from "@google/generative-ai";

config({ path: resolve(__dirname, "../.env.local") });

async function listModels() {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    console.error("Missing GEMINI_API_KEY");
    return;
  }

  const genAI = new GoogleGenerativeAI(apiKey);
  
  const modelsToTry = ["gemini-1.5-flash", "gemini-1.5-pro", "gemini-pro", "gemini-1.0-pro"];

  for (const modelName of modelsToTry) {
    try {
      console.log(`--- Testing model: ${modelName} ---`);
      const model = genAI.getGenerativeModel({ model: modelName });
      const result = await model.generateContent("Say 'READY'");
      console.log(`[OK] ${modelName} responded: ${result.response.text().trim()}`);
      return; // Stop at first success
    } catch (err: any) {
      console.error(`[FAIL] ${modelName}: ${err.message}`);
    }
  }
}

listModels();
