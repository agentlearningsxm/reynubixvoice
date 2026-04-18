import { GoogleGenAI } from '@google/genai';
import { GEMINI_LIVE_API_VERSION } from '../../lib/voice/models.js';

export function resolveGeminiApiKey() {
  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey) {
    throw new Error('Gemini API key is not configured.');
  }

  return apiKey;
}

export function getGeminiAdminClient() {
  return new GoogleGenAI({
    apiKey: resolveGeminiApiKey(),
  });
}

export function getGeminiLiveAdminClient() {
  return new GoogleGenAI({
    apiKey: resolveGeminiApiKey(),
    httpOptions: { apiVersion: GEMINI_LIVE_API_VERSION },
  });
}
