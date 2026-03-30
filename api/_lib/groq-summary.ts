import type { ChatCompletionCreateParamsBase } from 'groq-sdk/resources/chat/completions';
import {
  getGroqAdminClient,
  getGroqAnalysisModelCandidates,
  supportsStrictStructuredOutputs,
} from './groq.js';

export interface SessionAnalysisInput {
  transcript: string;
  language: string;
  durationSec: number;
  calculatorUsed: boolean;
  revenueEntered: string | number | null;
  missedCalls: string | number | null;
  bookingRequested: boolean;
  errorLog: string;
  sessionId: string;
}

export interface TranscriptAnalysis {
  summary: string;
  sentiment: string;
  callQualityScore: number;
  errorsDetected: string;
  promptFixRecommendations: string;
  failureSource: string;
  callOutcome: string;
}

const SENTIMENTS = ['positive', 'neutral', 'negative', 'frustrated'] as const;
const FAILURE_SOURCES = [
  'greeting',
  'qualification',
  'calculator',
  'booking',
  'transfer',
  'closing',
  'none',
] as const;
const CALL_OUTCOMES = [
  'qualified-lead',
  'information-only',
  'dropped',
  'error',
  'booking-made',
] as const;

const ANALYSIS_SCHEMA = {
  name: 'transcript_analysis',
  schema: {
    type: 'object',
    additionalProperties: false,
    properties: {
      summary: { type: 'string' },
      sentiment: { type: 'string', enum: [...SENTIMENTS] },
      callQualityScore: { type: 'integer', minimum: 1, maximum: 10 },
      errorsDetected: { type: 'string' },
      promptFixRecommendations: { type: 'string' },
      failureSource: { type: 'string', enum: [...FAILURE_SOURCES] },
      callOutcome: { type: 'string', enum: [...CALL_OUTCOMES] },
    },
    required: [
      'summary',
      'sentiment',
      'callQualityScore',
      'errorsDetected',
      'promptFixRecommendations',
      'failureSource',
      'callOutcome',
    ],
  },
  strict: true,
} as const;

const DEFAULT_ANALYSIS: TranscriptAnalysis = {
  summary: 'Summary unavailable',
  sentiment: 'neutral',
  callQualityScore: 0,
  errorsDetected: 'Analysis unavailable',
  promptFixRecommendations: 'N/A',
  failureSource: 'none',
  callOutcome: 'information-only',
};

function truncate(value: string, maxLength: number) {
  return value.length > maxLength ? `${value.slice(0, maxLength)}...` : value;
}

function buildAnalysisPrompt(input: SessionAnalysisInput) {
  return `You are a strict QA reviewer for Reyna, a voice AI receptionist built by ReynubixVoice.

Analyze the complete session data and return a JSON object with exactly these 7 fields:
- summary: 2 to 3 sentence summary including the caller goal, key discussion points, outcome, and next steps
- sentiment: one of positive, neutral, negative, frustrated
- callQualityScore: integer from 1 to 10
- errorsDetected: semicolon-separated list of all important issues, or "None detected"
- promptFixRecommendations: specific prompt changes that would prevent the issues, or "No changes needed"
- failureSource: one of greeting, qualification, calculator, booking, transfer, closing, none
- callOutcome: one of qualified-lead, information-only, dropped, error, booking-made

Scoring priorities:
- accuracy of information
- natural conversational flow
- correct tool usage
- handling interruptions and off-topic requests
- professional helpful tone

Use every available field when forming the analysis:
${JSON.stringify(
  {
    sessionId: input.sessionId,
    language: input.language,
    durationSec: input.durationSec,
    calculatorUsed: input.calculatorUsed,
    revenueEntered: input.revenueEntered ?? 'N/A',
    missedCalls: input.missedCalls ?? 'N/A',
    bookingRequested: input.bookingRequested,
    errorLog: truncate(input.errorLog || 'None', 2000),
  },
  null,
  2,
)}

Transcript (may be truncated):
${truncate(input.transcript, 24000)}

Return only raw JSON.`;
}

function parseJsonResponse(content: string) {
  const cleaned = content.replace(/^```(?:json)?\s*|\s*```$/g, '').trim();
  return JSON.parse(cleaned) as Record<string, unknown>;
}

function normalizeEnum<T extends readonly string[]>(
  value: unknown,
  allowed: T,
  fallback: T[number],
) {
  const normalized =
    typeof value === 'string' ? value.trim().toLowerCase() : '';
  return (allowed as readonly string[]).includes(normalized)
    ? (normalized as T[number])
    : fallback;
}

function normalizeText(value: unknown, fallback: string) {
  if (typeof value !== 'string') {
    return fallback;
  }

  const normalized = value.trim();
  return normalized.length > 0 ? normalized : fallback;
}

function normalizeScore(value: unknown) {
  const numericValue =
    typeof value === 'number' ? value : Number.parseInt(String(value), 10);

  if (!Number.isFinite(numericValue)) {
    return 0;
  }

  return Math.min(10, Math.max(1, Math.round(numericValue)));
}

export function normalizeAnalysis(
  parsed: Record<string, unknown>,
): TranscriptAnalysis {
  return {
    summary: normalizeText(parsed.summary, DEFAULT_ANALYSIS.summary),
    sentiment: normalizeEnum(parsed.sentiment, SENTIMENTS, 'neutral'),
    callQualityScore: normalizeScore(parsed.callQualityScore),
    errorsDetected: normalizeText(
      parsed.errorsDetected,
      DEFAULT_ANALYSIS.errorsDetected,
    ),
    promptFixRecommendations: normalizeText(
      parsed.promptFixRecommendations,
      DEFAULT_ANALYSIS.promptFixRecommendations,
    ),
    failureSource: normalizeEnum(parsed.failureSource, FAILURE_SOURCES, 'none'),
    callOutcome: normalizeEnum(
      parsed.callOutcome,
      CALL_OUTCOMES,
      'information-only',
    ),
  };
}

function buildResponseFormat(model: string) {
  if (supportsStrictStructuredOutputs(model)) {
    return {
      type: 'json_schema',
      json_schema: ANALYSIS_SCHEMA,
    } satisfies NonNullable<ChatCompletionCreateParamsBase['response_format']>;
  }

  return {
    type: 'json_object',
  } satisfies NonNullable<ChatCompletionCreateParamsBase['response_format']>;
}

export async function analyzeSessionData(
  input: SessionAnalysisInput,
): Promise<TranscriptAnalysis> {
  if (!input.transcript.trim()) {
    return {
      summary: 'No transcript available',
      sentiment: 'neutral',
      callQualityScore: 0,
      errorsDetected: 'No transcript to analyze',
      promptFixRecommendations: 'N/A',
      failureSource: 'none',
      callOutcome: 'information-only',
    };
  }

  const groq = getGroqAdminClient();
  const models = getGroqAnalysisModelCandidates();
  const modelErrors: string[] = [];

  for (const model of models) {
    try {
      const response = await groq.chat.completions.create({
        model,
        messages: [
          {
            role: 'user',
            content: buildAnalysisPrompt(input),
          },
        ],
        temperature: 0.2,
        max_completion_tokens: 600,
        response_format: buildResponseFormat(model),
      });

      const rawContent = response.choices[0]?.message?.content;
      const content = typeof rawContent === 'string' ? rawContent.trim() : '';
      if (!content) {
        throw new Error('Empty Groq response content');
      }

      return normalizeAnalysis(parseJsonResponse(content));
    } catch (error) {
      const message =
        error instanceof Error ? error.message : JSON.stringify(error);
      modelErrors.push(`${model}: ${message}`);
    }
  }

  console.error('Groq transcript analysis failed for all candidate models', {
    models,
    modelErrors,
  });

  return {
    summary: 'Analysis failed - check Groq logs',
    sentiment: 'neutral',
    callQualityScore: 0,
    errorsDetected: 'Analysis failed',
    promptFixRecommendations:
      'Review Groq model configuration and response formatting',
    failureSource: 'none',
    callOutcome: 'error',
  };
}
