import { analyzeTranscriptWithGemini } from './gemini-summary.js';
import { analyzeTranscriptWithGroq } from './groq-summary.js';
import {
  createFailedTranscriptAnalysis,
  type TranscriptAnalysis,
} from './transcript-analysis-shared.js';

type AnalysisProvider = 'auto' | 'gemini' | 'groq';

function readProvider(): AnalysisProvider {
  const value = process.env.SHEET_ANALYSIS_PROVIDER?.trim().toLowerCase();
  if (value === 'gemini' || value === 'groq') {
    return value;
  }
  return 'auto';
}

export async function analyzeTranscript(
  transcript: string,
): Promise<TranscriptAnalysis> {
  const provider = readProvider();
  const order =
    provider === 'groq'
      ? [analyzeTranscriptWithGroq, analyzeTranscriptWithGemini]
      : [analyzeTranscriptWithGemini, analyzeTranscriptWithGroq];

  let lastError: unknown = null;
  for (const analyze of order) {
    try {
      return await analyze(transcript);
    } catch (error) {
      lastError = error;
      console.warn('[sheet-sync] Transcript analysis provider failed:', error);
    }
  }

  console.error(
    '[sheet-sync] Transcript analysis failed for every configured provider.',
    lastError,
  );
  return createFailedTranscriptAnalysis();
}
