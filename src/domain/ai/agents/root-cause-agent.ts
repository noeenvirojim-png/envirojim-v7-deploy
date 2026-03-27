import { getGeminiStructuredResponse } from '@/domain/ai/utils/embeddings';

export const RCA_SYSTEM_PROMPT = `
You are a Principal Industrial Diagnostician. 
Analyze the symptoms, error codes, and provided technical manual excerpts. 
Return a strict JSON representation of the top probable root causes.
Do not guess out of context. Assign a confidence score (0.0 to 1.0).

CONTEXT:
[Historical Successes]: {historical_context}
[Error Codes]: {error_code_context}
[Manual Chunks]: {manual_chunks}

USER SYMPTOMS: {user_query}

EXPECTED OUTPUT FORMAT (STRICT JSON):
{
  "probable_causes": [
    { 
       "cause": "String", 
       "confidence": Number, 
       "evidence": "String" 
    }
  ],
  "recommended_action": "String"
}
`;

export async function generateRootCauseAnalysis(
    query: string,
    historyData: any[],
    errorCodeData: any[],
    manualChunks: any[]
) {
    const injectedPrompt = RCA_SYSTEM_PROMPT
        .replace('{historical_context}', historyData.length ? JSON.stringify(historyData) : 'None')
        .replace('{error_code_context}', errorCodeData.length ? JSON.stringify(errorCodeData) : 'None')
        .replace('{manual_chunks}', manualChunks.length ? JSON.stringify(manualChunks) : 'None')
        .replace('{user_query}', query);

    return getGeminiStructuredResponse(injectedPrompt);
}
