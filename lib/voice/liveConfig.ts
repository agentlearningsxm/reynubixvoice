import { Modality, Type, type LiveConnectConfig } from '@google/genai';
import type { VoiceSpeaker } from '../telemetry/shared';

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

export const LIVE_SESSION_BACKUP_STORAGE_KEY =
  'reynubixvoice.live-session-backup';
const MAX_RESTORE_TURNS = 10;
const MAX_RESTORE_TEXT_LENGTH = 280;

export interface ReconnectTranscriptEntry {
  speaker: VoiceSpeaker;
  text: string;
  isFinal?: boolean;
}

export interface LiveSessionBackup {
  voiceSessionId: string | null;
  transcript: ReconnectTranscriptEntry[];
  resumptionHandle: string | null;
  startedAt: number | null;
  lastUpdatedAt: number;
}

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
    sessionResumption,
    speechConfig: {
      voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Kore' } },
    },
    outputAudioTranscription: {},
    inputAudioTranscription: {},
  };
}

function sanitizeTranscriptText(value: string) {
  return value.replace(/\s+/g, ' ').trim().slice(0, MAX_RESTORE_TEXT_LENGTH);
}

export function buildReconnectRestoreTurns(
  transcript: ReconnectTranscriptEntry[],
) {
  const recentTurns = transcript
    .filter((entry) => entry.isFinal !== false)
    .map((entry) => ({
      role: entry.speaker === 'human' ? 'user' : 'model',
      parts: [{ text: sanitizeTranscriptText(entry.text) }],
    }))
    .filter((entry) => entry.parts[0].text.length > 0)
    .slice(-MAX_RESTORE_TURNS);

  if (recentTurns.length === 0) {
    return [
      {
        role: 'user' as const,
        parts: [
          {
            text: 'System note: This is the same live call after a brief connection hiccup. Continue naturally without greeting again.',
          },
        ],
      },
    ];
  }

  return [
    ...recentTurns,
    {
      role: 'user' as const,
      parts: [
        {
          text: 'System note: The live connection briefly hiccupped, but this is still the same conversation. Do not restart, do not re-introduce yourself, and continue from the last topic naturally.',
        },
      ],
    },
  ];
}
