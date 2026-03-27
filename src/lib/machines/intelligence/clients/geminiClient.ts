import { GoogleGenerativeAI } from '@google/generative-ai';
import {
  DEFAULT_TIMEOUT_LITE_MS,
  DEFAULT_TIMEOUT_FLASH_MS,
  DEFAULT_TIMEOUT_PRO_MS,
  DEFAULT_MAX_RETRIES,
  DEFAULT_RETRY_BACKOFF_MS,
  DEFAULT_CLASSIFIER_MODEL,
  DEFAULT_EXTRACTION_MODEL,
} from '../config/geminiConfig';

const ai = new GoogleGenerativeAI(process.env.GOOGLE_AI_API_KEY!);

function getTimeoutForModel(model: string): number {
  if (model.includes('lite')) return DEFAULT_TIMEOUT_LITE_MS;
  if (model.includes('pro')) return DEFAULT_TIMEOUT_PRO_MS;
  return DEFAULT_TIMEOUT_FLASH_MS;
}

export async function runGeminiJsonExtraction<T>(params: {
  model: string;
  prompt: string;
  extractor: string;
  doc_id: string;
  chunk_id?: string;
  schema?: object;
}): Promise<T> {
  const { model, prompt, extractor, doc_id, chunk_id } = params;
  const timeoutMs = getTimeoutForModel(model);
  const started = Date.now();

  const geminiModel = ai.getGenerativeModel({
    model,
    generationConfig: { responseMimeType: 'application/json' },
  });

  let lastError: Error | null = null;

  for (let attempt = 0; attempt <= DEFAULT_MAX_RETRIES; attempt++) {
    if (attempt > 0) {
      const backoff = DEFAULT_RETRY_BACKOFF_MS[attempt - 1] ?? 5000;
      await new Promise(r => setTimeout(r, backoff));
    }

    let timer: ReturnType<typeof setTimeout>;
    const timeoutPromise = new Promise<never>((_, reject) => {
      timer = setTimeout(
        () => reject(new Error(`GEMINI_TIMEOUT: ${model} exceeded ${timeoutMs}ms`)),
        timeoutMs,
      );
    });

    try {
      const result = await Promise.race([
        geminiModel.generateContent(prompt),
        timeoutPromise,
      ]);
      clearTimeout(timer!);

      const text = result.response.text().trim();
      const elapsed = Date.now() - started;
      console.log(`[gemini] model=${model} extractor=${extractor} doc=${doc_id}${chunk_id ? ` chunk=${chunk_id}` : ''} elapsed=${elapsed}ms OK`);

      let parsed: T;
      try {
        parsed = JSON.parse(text) as T;
      } catch {
        throw new Error(`JSON_PARSE_ERROR: ${text.slice(0, 200)}`);
      }
      return parsed;
    } catch (e) {
      clearTimeout(timer!);
      lastError = e as Error;
      const elapsed = Date.now() - started;
      console.error(`[gemini] model=${model} extractor=${extractor} doc=${doc_id} attempt=${attempt + 1} elapsed=${elapsed}ms FAIL: ${lastError.message.slice(0, 200)}`);
      if (lastError.message.startsWith('GEMINI_TIMEOUT') || lastError.message.startsWith('JSON_PARSE_ERROR')) break;
    }
  }

  throw lastError!;
}
