import { afterEach, describe, expect, it } from 'vitest';
import { getGroqAnalysisModelCandidates } from '../../api/_lib/groq.js';
import { normalizeAnalysis } from '../../api/_lib/groq-summary.js';

const originalEnv = { ...process.env };

afterEach(() => {
  process.env = { ...originalEnv };
});

describe('getGroqAnalysisModelCandidates', () => {
  it('prefers the configured primary model and deduplicates fallbacks', () => {
    process.env.GROQ_SHEET_ANALYSIS_MODEL = 'openai/gpt-oss-120b';
    process.env.GROQ_SHEET_ANALYSIS_MODELS =
      'qwen/qwen3-32b, openai/gpt-oss-120b, qwen/qwen3-32b';

    expect(getGroqAnalysisModelCandidates().slice(0, 3)).toEqual([
      'openai/gpt-oss-120b',
      'qwen/qwen3-32b',
      'openai/gpt-oss-20b',
    ]);
  });
});

describe('normalizeAnalysis', () => {
  it('normalizes malformed provider output into the expected sheet contract', () => {
    expect(
      normalizeAnalysis({
        summary: '',
        sentiment: 'happy',
        callQualityScore: 22,
        errorsDetected: '',
        promptFixRecommendations: '',
        failureSource: 'routing',
        callOutcome: 'success',
      }),
    ).toEqual({
      summary: 'Summary unavailable',
      sentiment: 'neutral',
      callQualityScore: 10,
      errorsDetected: 'Analysis unavailable',
      promptFixRecommendations: 'N/A',
      failureSource: 'none',
      callOutcome: 'information-only',
    });
  });
});
