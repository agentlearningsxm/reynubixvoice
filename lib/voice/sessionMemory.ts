import type {
  TranscriptTurnPayload,
  VoiceSpeaker,
} from '../telemetry/shared.js';

export interface TranscriptLike {
  speaker: VoiceSpeaker;
  text: string;
  isFinal?: boolean;
}

export interface VoiceSessionBackup {
  voiceSessionId: string | null;
  sessionResumptionHandle: string | null;
  transcript: TranscriptLike[];
  updatedAt: number;
  sessionStartedAt: number;
  greetingDelivered: boolean;
  lastToolCallName: string | null;
}

export const VOICE_SESSION_BACKUP_KEY = 'reynubixvoice.live-session-backup';
export const VOICE_SESSION_BACKUP_MAX_AGE_MS = 1 * 60 * 60 * 1000;

const MAX_BACKUP_TURNS = 12;
const MAX_RESUME_CONTEXT_TURNS = 8;

function normalizeTranscriptText(text: string) {
  return text.replace(/\s+/g, ' ').trim();
}

export function compactTranscript(
  transcript: TranscriptLike[],
  maxTurns = MAX_BACKUP_TURNS,
) {
  return transcript
    .map((entry) => ({
      ...entry,
      text: normalizeTranscriptText(entry.text),
      isFinal: entry.isFinal ?? true,
    }))
    .filter((entry) => entry.text)
    .slice(-maxTurns);
}

export function inferGreetingDelivered(transcript: TranscriptLike[]) {
  return compactTranscript(transcript).some(
    (entry) =>
      entry.speaker === 'ai' && entry.text.toLowerCase().includes("i'm reyna"),
  );
}

export function readVoiceSessionBackup() {
  if (typeof window === 'undefined') {
    return null;
  }

  try {
    const raw = window.sessionStorage.getItem(VOICE_SESSION_BACKUP_KEY);
    if (!raw) {
      return null;
    }

    const parsed = JSON.parse(raw) as VoiceSessionBackup;
    if (
      !parsed?.updatedAt ||
      Date.now() - parsed.updatedAt > VOICE_SESSION_BACKUP_MAX_AGE_MS
    ) {
      window.sessionStorage.removeItem(VOICE_SESSION_BACKUP_KEY);
      return null;
    }

    return {
      ...parsed,
      transcript: compactTranscript(parsed.transcript),
    };
  } catch {
    return null;
  }
}

export function writeVoiceSessionBackup(backup: VoiceSessionBackup | null) {
  if (typeof window === 'undefined') {
    return;
  }

  try {
    if (!backup) {
      window.sessionStorage.removeItem(VOICE_SESSION_BACKUP_KEY);
      return;
    }

    window.sessionStorage.setItem(
      VOICE_SESSION_BACKUP_KEY,
      JSON.stringify({
        ...backup,
        transcript: compactTranscript(backup.transcript),
      }),
    );
  } catch {
    // Ignore storage quota or serialization issues.
  }
}

export function createPendingSessionBackup(): VoiceSessionBackup {
  const now = Date.now();
  const backup: VoiceSessionBackup = {
    voiceSessionId: null,
    sessionResumptionHandle: null,
    transcript: [],
    updatedAt: now,
    sessionStartedAt: now,
    greetingDelivered: false,
    lastToolCallName: null,
  };
  writeVoiceSessionBackup(backup);
  return backup;
}

export function buildResumeContextNote(
  transcript: TranscriptLike[],
  options: {
    greetingDelivered?: boolean;
    lastToolCallName?: string | null;
  } = {},
) {
  const recentTurns = compactTranscript(transcript, MAX_RESUME_CONTEXT_TURNS);
  const conversationLines = recentTurns.map((entry) => {
    const speaker = entry.speaker === 'human' ? 'Visitor' : 'Reyna';
    return `${speaker}: ${entry.text.slice(0, 220)}`;
  });

  const notes = [
    '[System resume note: This is the same ongoing Reyna call.',
    options.greetingDelivered
      ? 'Your greeting already happened earlier, so do not introduce yourself again.'
      : 'Greet only if you truly have not greeted yet.',
    options.lastToolCallName
      ? `The last successful tool call was ${options.lastToolCallName}.`
      : null,
    conversationLines.length
      ? `Recent context: ${conversationLines.join(' | ')}.`
      : 'Continue from the prior topic without restarting the conversation.',
    'Pick up naturally from the latest topic and continue the same session.]',
  ]
    .filter(Boolean)
    .join(' ');

  return notes.slice(0, 1800);
}

export function buildReconnectRestoreTurns(
  transcript: TranscriptLike[],
  options: {
    greetingDelivered?: boolean;
    lastToolCallName?: string | null;
  } = {},
) {
  const recentTurns = compactTranscript(
    transcript,
    MAX_RESUME_CONTEXT_TURNS,
  ).map((entry) => ({
    role: entry.speaker === 'human' ? ('user' as const) : ('model' as const),
    parts: [{ text: entry.text.slice(0, 220) }],
  }));

  return [
    ...recentTurns,
    {
      role: 'user' as const,
      parts: [
        {
          text: buildResumeContextNote(transcript, options),
        },
      ],
    },
  ];
}

export const buildResumeTurns = buildReconnectRestoreTurns;

export function toTranscriptTurnPayload(
  transcript: TranscriptLike[],
): TranscriptTurnPayload[] {
  return compactTranscript(transcript, transcript.length).map(
    (entry, index) => ({
      turnIndex: index,
      speaker: entry.speaker,
      text: entry.text,
      isFinal: entry.isFinal ?? true,
      capturedAt: new Date().toISOString(),
    }),
  );
}
