// Re-export from new config location for backward compat
export {
  DEFAULT_CLASSIFIER_MODEL as GEMINI_MODEL,
  DEFAULT_EXTRACTION_MODEL,
  DEFAULT_TIMEOUT_FLASH_MS as GEMINI_TIMEOUT_MS,
} from './config/geminiConfig';

export const MAX_CHUNK_CHARS = 28000;
export const MAX_INVENTORY_CHARS = 12000;

// withGeminiTimeout kept for any direct callers
export async function withGeminiTimeout<T>(promise: Promise<T>, timeoutMs = 45000): Promise<T> {
  let timer: ReturnType<typeof setTimeout>;
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(new Error(`GEMINI_TIMEOUT: call exceeded ${timeoutMs}ms`)), timeoutMs);
  });
  try {
    return await Promise.race([promise, timeout]);
  } finally {
    clearTimeout(timer!);
  }
}
