import { type LiveConnectConfig, Modality, Type } from '@google/genai';
import {
  buildReconnectRestoreTurns as buildSessionReconnectRestoreTurns,
  type TranscriptLike,
} from './sessionMemory.js';

export const GEMINI_LIVE_TOOLS = [
  {
    functionDeclarations: [
      {
        name: 'show_calculator',
        description:
          'Scroll the Revenue Loss Calculator into view. Call this when you START asking about revenue or missed calls, BEFORE you have both numbers. Does not animate anything.',
        parameters: {
          type: Type.OBJECT,
          properties: {},
          required: [],
        },
      },
      {
        name: 'update_calculator',
        description:
          'Update the values in the Revenue Loss Calculator to show the visitor their potential monthly loss.',
        parameters: {
          type: Type.OBJECT,
          properties: {
            revenue: {
              type: Type.NUMBER,
              description: 'Average revenue per customer in dollars',
            },
            missedCalls: {
              type: Type.NUMBER,
              description: 'Missed calls per day (1-20)',
            },
          },
          required: ['revenue', 'missedCalls'],
        },
      },
      {
        name: 'open_cal_popup',
        description:
          'Open the Cal.com booking popup so the visitor can schedule a call. ONLY use this AFTER the visitor explicitly agrees to book.',
        parameters: {
          type: Type.OBJECT,
          properties: {},
          required: [],
        },
      },
    ],
  },
];

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
    responseModalities: [Modality.AUDIO],
    systemInstruction,
    tools: GEMINI_LIVE_TOOLS,
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
