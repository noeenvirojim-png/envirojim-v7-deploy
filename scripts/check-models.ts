import { GoogleGenerativeAI } from "@google/generative-ai";

async function run() {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error("Missing Key");
  
  const genAI = new GoogleGenerativeAI(apiKey);
  try {
    const models = await genAI.listModels();
    console.log(JSON.stringify(models, null, 2));
  } catch (err: any) {
    console.error(`[FAIL] ListModels: ${err.message}`);
  }
}

run();
