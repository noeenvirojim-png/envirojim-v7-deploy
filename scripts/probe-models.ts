import dotenv from "dotenv";
dotenv.config({ path: "../.env" });
import { GoogleGenerativeAI } from "@google/generative-ai";

async function run() {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error("Missing AIza key");
  
  const genAI = new GoogleGenerativeAI(apiKey);
  // The SDK doesn't have a direct listModels, but we can try to find out via an error or just probe.
  // Actually, I'll just try 'gemini-1.5-flash-latest' which is the current "canonical" name.
  
  console.log("Probing gemini-1.5-flash-latest...");
  try {
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash-latest" });
    const result = await model.generateContent("echo 'hello'");
    console.log("RESULT:", result.response.text());
  } catch (e: any) {
    console.log("PROBE_FAILED:", e.message);
  }
}

run();
