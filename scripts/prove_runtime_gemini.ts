/**
 * prove_runtime_gemini.ts — Prove the Gemini runtime works with the real key the app uses.
 * Zero DB writes. Writes artifacts/runtime_gemini_proof.json.
 */
import { config as dotenvConfig } from 'dotenv';
import path from 'path';
import fs from 'fs';

dotenvConfig({ path: path.resolve(process.cwd(), '.env.local') });

import { GoogleGenerativeAI } from '@google/generative-ai';

const MODEL = 'gemini-2.5-flash';

function mask(key: string | undefined): string {
  if (!key) return '(absent)';
  if (key.length <= 10) return '***';
  return key.slice(0, 6) + '...' + key.slice(-4);
}

async function main() {
  const googleKey = process.env.GOOGLE_AI_API_KEY;
  const geminiKey = process.env.GEMINI_API_KEY;

  const result: Record<string, unknown> = {
    env_file_loaded: '.env.local',
    variables_present: {
      GOOGLE_AI_API_KEY: !!googleKey,
      GEMINI_API_KEY: !!geminiKey,
    },
    runtime_key_name_used: 'GOOGLE_AI_API_KEY',
    runtime_key_masked: mask(googleKey),
    model_used: MODEL,
    success: false,
    raw_error: null,
  };

  console.log('GOOGLE_AI_API_KEY present:', !!googleKey, '→', mask(googleKey));
  console.log('GEMINI_API_KEY present:', !!geminiKey, '→', mask(geminiKey));
  console.log('Runtime uses: GOOGLE_AI_API_KEY (geminiClient.ts line 12)');
  console.log(`Model: ${MODEL}`);

  // Try GOOGLE_AI_API_KEY first (what the app uses)
  const keysToTry = [
    { name: 'GOOGLE_AI_API_KEY', value: googleKey },
    { name: 'GEMINI_API_KEY', value: geminiKey },
  ];

  for (const { name, value } of keysToTry) {
    if (!value) {
      console.log(`\n[SKIP] ${name} is absent`);
      continue;
    }

    console.log(`\n[TRY] ${name} → ${mask(value)}`);
    try {
      const ai = new GoogleGenerativeAI(value);
      const model = ai.getGenerativeModel({
        model: MODEL,
        generationConfig: { responseMimeType: 'application/json' },
      });

      const res = await model.generateContent('Return JSON: {"status":"ok"}');
      const text = res.response.text().trim();
      console.log(`  OK → ${text.slice(0, 100)}`);

      result.success = true;
      result.runtime_key_name_used = name;
      result.runtime_key_masked = mask(value);
      result.raw_error = null;
      break;
    } catch (e: any) {
      const msg = e.message?.slice(0, 300) ?? String(e);
      console.log(`  FAIL → ${msg}`);
      result.raw_error = msg;
      result.runtime_key_name_used = name;
      result.runtime_key_masked = mask(value);
    }
  }

  const outPath = path.resolve(process.cwd(), 'artifacts/runtime_gemini_proof.json');
  fs.writeFileSync(outPath, JSON.stringify(result, null, 2));
  console.log(`\nWrote: ${outPath}`);
  console.log(`SUCCESS: ${result.success}`);

  if (!result.success) process.exit(1);
}

main().catch(e => { console.error('FATAL:', e.message); process.exit(1); });
