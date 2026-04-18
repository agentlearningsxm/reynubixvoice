import type { LiveConnectConfig } from '@google/genai';
import {
  buildReconnectRestoreTurns as buildSessionReconnectRestoreTurns,
  type TranscriptLike,
} from './sessionMemory.js';

export const GEMINI_LIVE_TOOLS: any[] = [];

export const REYNA_GEMINI_VOICE = 'Sulafat';

export function buildGeminiLiveConfig(
  systemInstruction: string,
  options: {
    sessionResumptionHandle?: string | null;
  } = {},
): LiveConnectConfig {
  return {
    responseModalities: ['audio' as any],
    systemInstruction,
    ...(GEMINI_LIVE_TOOLS.length > 0 ? { tools: GEMINI_LIVE_TOOLS } : {}),
    // Omit contextWindowCompression entirely — sending { slidingWindow: {} }
    // with an empty SlidingWindow object causes the server to close the
    // WebSocket cleanly at setup (code 1000), same failure mode as the
    // previously documented empty sessionResumption bug.
    // Omit sessionResumption entirely on fresh sessions — sending an empty
    // object causes the server to close the WebSocket at setup (code 1000).
    ...(options.sessionResumptionHandle
      ? { sessionResumption: { handle: options.sessionResumptionHandle } }
      : {}),
    speechConfig: {
      voiceConfig: {
        prebuiltVoiceConfig: {
          voiceName: REYNA_GEMINI_VOICE,
        },
      },
    },
    outputAudioTranscription: {},
    inputAudioTranscription: {},
  };
}

export function buildReconnectRestoreTurns(
  transcript: TranscriptLike[],
  options: {
    greetingDelivered?: boolean;
    lastToolCallName?: string | null;
  } = {},
) {
  return buildSessionReconnectRestoreTurns(transcript, options);
}
