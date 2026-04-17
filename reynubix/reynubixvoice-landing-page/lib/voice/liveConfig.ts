import { type LiveConnectConfig } from '@google/genai';
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
  // The Gemini API accepts session resumption handles, but the current
  // @google/genai Gemini transport rejects the `transparent` flag even though
  // it exists in the shared type surface.
  const sessionResumption = options.sessionResumptionHandle
    ? { handle: options.sessionResumptionHandle }
    : {};

  return {
    responseModalities: ['audio' as any],
    systemInstruction,
    ...(GEMINI_LIVE_TOOLS.length > 0 ? { tools: GEMINI_LIVE_TOOLS } : {}),
    contextWindowCompression: {
      slidingWindow: {},
    },
    sessionResumption,
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
