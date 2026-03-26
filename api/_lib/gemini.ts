import { GoogleGenAI } from '@google/genai';

export function getGeminiAdminClient() {
  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey) {
    throw new Error(
      'GEMINI_API_KEY is required for Gemini Live token issuance.',
    );
  }

  return new GoogleGenAI({
    apiKey,
    httpOptions: { apiVersion: 'v1alpha' },
  });
}
