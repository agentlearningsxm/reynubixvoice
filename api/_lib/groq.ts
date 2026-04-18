import Groq from 'groq-sdk';

const DEFAULT_GROQ_ANALYSIS_MODELS = [
  'openai/gpt-oss-120b',
  'qwen/qwen3-32b',
  'openai/gpt-oss-20b',
];

function requireGroqApiKey() {
  const apiKey = process.env.GROQ_API_KEY?.trim();

  if (!apiKey) {
    throw new Error('Groq API key is not configured.');
  }

  return apiKey;
}

export function getGroqAdminClient() {
  return new Groq({
    apiKey: requireGroqApiKey(),
  });
}

function parseModelList(rawValue: string | undefined) {
  return (rawValue ?? '')
    .split(',')
    .map((value) => value.trim())
    .filter(Boolean);
}

export function getGroqAnalysisModelCandidates() {
  const primaryModel =
    process.env.GROQ_SHEET_ANALYSIS_MODEL?.trim() ||
    DEFAULT_GROQ_ANALYSIS_MODELS[0];
  const configuredFallbacks = parseModelList(
    process.env.GROQ_SHEET_ANALYSIS_MODELS,
  );

  const dedupedModels = new Set<string>([
    primaryModel,
    ...configuredFallbacks,
    ...DEFAULT_GROQ_ANALYSIS_MODELS,
  ]);

  return [...dedupedModels];
}

export function supportsStrictStructuredOutputs(model: string) {
  return model === 'openai/gpt-oss-20b' || model === 'openai/gpt-oss-120b';
}
