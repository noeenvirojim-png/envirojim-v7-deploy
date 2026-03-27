import dotenv from "dotenv";
dotenv.config({ path: "../.env" });
console.log(process.env.GEMINI_API_KEY ? 'KEY_PRESENT' : 'KEY_MISSING');
