export interface TranscriptAnalysis {
  summary: string;
  sentiment: string;
  callQualityScore: number;
  errorsDetected: string;
  promptFixRecommendations: string;
  failureSource: string;
  callOutcome: string;
}

const DEFAULT_ANALYSIS_TRANSCRIPT_MAX_CHARS = 30000;

function readAnalysisTranscriptMaxChars() {
  const rawValue = process.env.SHEET_ANALYSIS_TRANSCRIPT_MAX_CHARS?.trim();
  const parsed = Number.parseInt(rawValue || '', 10);
  return Number.isFinite(parsed) && parsed >= 4000
    ? parsed
    : DEFAULT_ANALYSIS_TRANSCRIPT_MAX_CHARS;
}

function fitTranscriptForAnalysis(transcript: string) {
  const normalized = transcript.trim();
  const maxChars = readAnalysisTranscriptMaxChars();
  if (normalized.length <= maxChars) {
    return normalized;
  }

  const headChars = Math.floor(maxChars * 0.6);
  const tailChars = maxChars - headChars;
  const omittedChars = normalized.length - headChars - tailChars;

  return [
    normalized.slice(0, headChars),
    '',
    `[Transcript abridged for model context. ${omittedChars} characters omitted from the middle.]`,
    '',
    normalized.slice(-tailChars),
  ].join('\n');
}

export function createEmptyTranscriptAnalysis(): TranscriptAnalysis {
  return {
    summary: 'No transcript available',
    sentiment: 'neutral',
    callQualityScore: 0,
    errorsDetected: 'No transcript to analyze',
    promptFixRecommendations: 'N/A',
    failureSource: 'unknown',
    callOutcome: 'unknown',
  };
}

export function createFailedTranscriptAnalysis(): TranscriptAnalysis {
  return {
    summary: 'Analysis failed -check logs',
    sentiment: 'unknown',
    callQualityScore: 0,
    errorsDetected: 'Analysis failed',
    promptFixRecommendations: 'N/A',
    failureSource: 'unknown',
    callOutcome: 'unknown',
  };
}

export function buildTranscriptAnalysisPrompt(transcript: string) {
  return `You are a strict QA reviewer for Reyna, a voice AI receptionist built by ReynubixVoice. Your job is to find every issue in this call transcript and provide actionable feedback.

Analyze the transcript and return a JSON object with exactly these 7 fields:

1. "summary": 2-3 sentence summary. Include: what the caller wanted, key discussion points, outcome, and any next steps or action items.

2. "sentiment": Exactly one word -"positive", "neutral", "negative", or "frustrated". Based on the caller's tone throughout the conversation.

3. "callQualityScore": Integer from 1-10. Score based on:
   - Accuracy of information provided (did Reyna give correct details?)
   - Natural conversational flow (did the dialogue feel human-like?)
   - Proper tool usage (did Reyna use calculator, booking, transfer tools correctly when needed?)
   - Handling of edge cases (unexpected questions, interruptions, off-topic requests)
   - Professional tone and helpfulness
   A score of 10 means flawless. A score of 1 means the call completely failed.

4. "errorsDetected": List ALL errors found, separated by semicolons. Look for:
   - Misunderstandings (Reyna misinterpreted what the caller said)
   - Wrong information given (incorrect pricing, services, availability)
   - Failed tool calls (calculator errors, booking failures, transfer issues)
   - Awkward or unnatural responses (robotic phrasing, repeated sentences)
   - Hallucinations (Reyna made up information not in her prompt)
   - Conversation loops (Reyna repeated the same thing multiple times)
   - Missed opportunities (caller showed interest but Reyna didn't follow up)
   If no errors found, write "None detected".

5. "promptFixRecommendations": Specific, actionable changes to Reyna's system prompt that would fix the errors detected. Be precise -reference exact phrases or behaviors to add/remove/change. If no fixes needed, write "No changes needed".

6. "failureSource": Which part of the call flow had the biggest issue. Use exactly one of: "greeting", "qualification", "calculator", "booking", "transfer", "closing", or "none". Pick "none" if the call went smoothly overall.

7. "callOutcome": Classify the final result. Use exactly one of: "qualified-lead", "information-only", "dropped", "error", "booking-made".
   - "qualified-lead" = caller showed genuine interest and may convert
   - "information-only" = caller just wanted info, no strong buying signal
   - "dropped" = call ended abruptly or caller hung up
   - "error" = technical failure prevented normal call flow
   - "booking-made" = a demo or consultation was successfully booked

Transcript:
${fitTranscriptForAnalysis(transcript)}

Respond with ONLY the raw JSON object. No markdown, no code fences, no extra text.`;
}

function extractJsonCandidate(rawText: string) {
  const cleaned = rawText.replace(/^```(?:json)?\n?|\n?```$/g, '').trim();
  const objectStart = cleaned.indexOf('{');
  const objectEnd = cleaned.lastIndexOf('}');

  if (objectStart !== -1 && objectEnd > objectStart) {
    return cleaned.slice(objectStart, objectEnd + 1).trim();
  }

  return cleaned;
}

export function parseTranscriptAnalysisResponse(
  rawText: string,
): TranscriptAnalysis {
  const parsed = JSON.parse(
    extractJsonCandidate(rawText),
  ) as Partial<TranscriptAnalysis>;

  return {
    summary: parsed.summary || 'Summary unavailable',
    sentiment: parsed.sentiment || 'neutral',
    callQualityScore:
      typeof parsed.callQualityScore === 'number'
        ? Math.max(0, Math.min(10, Math.round(parsed.callQualityScore)))
        : 0,
    errorsDetected: parsed.errorsDetected || 'Analysis unavailable',
    promptFixRecommendations: parsed.promptFixRecommendations || 'N/A',
    failureSource: parsed.failureSource || 'unknown',
    callOutcome: parsed.callOutcome || 'unknown',
  };
}
