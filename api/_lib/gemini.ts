import { GoogleGenAI } from '@google/genai';

export function getGeminiAdminClient() {
  const apiKey = process.env.GEMINI_API_KEY || process.env.VITE_GEMINI_API_KEY;

  if (!apiKey) {
    throw new Error('Gemini API key is not configured.');
  }

  return new GoogleGenAI({
    apiKey,
    httpOptions: { apiVersion: 'v1alpha' },
  });
}
