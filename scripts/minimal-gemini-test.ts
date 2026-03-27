import dotenv from "dotenv";
dotenv.config({ path: "../.env" });
import { GoogleGenerativeAI } from "@google/generative-ai";

async function run() {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error("Missing GEMINI_API_KEY");
  
  const genAI = new GoogleGenerativeAI(apiKey);
  const models = ["gemini-flash-latest", "gemini-2.0-flash-lite-001"];
  
  for (const m of models) {
    console.log(`\n--- Testing model: ${m} ---`);
    try {
      const model = genAI.getGenerativeModel({ model: m });
      const result = await model.generateContent("echo 'READY'");
      console.log("RESPONSE:", result.response.text());
    } catch (e: any) {
      console.error(`FAILED ${m}:`, e.message);
    }
  }
}

run();
