/**
 * Uses existing Gemini SDK to analyze voice call transcripts.
 * Returns a detailed QA analysis for the Google Sheet.
 */
import { getGeminiAdminClient } from './gemini.js';
import {
  buildTranscriptAnalysisPrompt,
  createEmptyTranscriptAnalysis,
  createFailedTranscriptAnalysis,
  parseTranscriptAnalysisResponse,
  type TranscriptAnalysis,
} from './transcript-analysis-shared.js';

export async function analyzeTranscriptWithGemini(
  transcript: string,
): Promise<TranscriptAnalysis> {
  if (!transcript.trim()) {
    return createEmptyTranscriptAnalysis();
  }

  const genai = getGeminiAdminClient();
  const response = await genai.models.generateContent({
    model: process.env.GEMINI_SHEET_ANALYSIS_MODEL || 'gemini-2.5-flash',
    contents: [
      {
        role: 'user',
        parts: [
          {
            text: buildTranscriptAnalysisPrompt(transcript),
          },
        ],
      },
    ],
  });

  return parseTranscriptAnalysisResponse(response.text?.trim() || '');
}

export async function analyzeTranscript(
  transcript: string,
): Promise<TranscriptAnalysis> {
  try {
    return await analyzeTranscriptWithGemini(transcript);
  } catch (error) {
    console.error('Gemini transcript analysis failed:', error);
    return createFailedTranscriptAnalysis();
  }
}
