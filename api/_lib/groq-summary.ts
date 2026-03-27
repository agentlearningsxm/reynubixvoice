import 'groq-sdk/shims/node';
import Groq from 'groq-sdk';
import {
  buildTranscriptAnalysisPrompt,
  createEmptyTranscriptAnalysis,
  parseTranscriptAnalysisResponse,
  type TranscriptAnalysis,
} from './transcript-analysis-shared.js';

function getGroqApiKey() {
  return process.env.GROQ_API_KEY?.trim();
}

export async function analyzeTranscriptWithGroq(
  transcript: string,
): Promise<TranscriptAnalysis> {
  if (!transcript.trim()) {
    return createEmptyTranscriptAnalysis();
  }

  const apiKey = getGroqApiKey();
  if (!apiKey) {
    throw new Error(
      'GROQ_API_KEY is required for server-side Groq transcript analysis.',
    );
  }

  const groq = new Groq({ apiKey });
  const response = await groq.chat.completions.create({
    model: process.env.GROQ_SHEET_ANALYSIS_MODEL || 'qwen/qwen3-32b',
    temperature: 0.2,
    max_tokens: 900,
    messages: [
      {
        role: 'user',
        content: buildTranscriptAnalysisPrompt(transcript),
      },
    ],
  });

  const content = response.choices[0]?.message?.content;
  const text =
    typeof content === 'string'
      ? content
      : Array.isArray(content)
        ? (content as Array<string | { text?: string }>)
            .map((part) => (typeof part === 'string' ? part : part.text || ''))
            .filter(Boolean)
            .join('\n')
        : '';

  return parseTranscriptAnalysisResponse(text.trim());
}
