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

export function toTranscriptTurnPayload(
  transcript: TranscriptLike[],
): TranscriptTurnPayload[] {
  return compactTranscript(transcript, transcript.length).map((entry, index) => ({
    turnIndex: index,
    speaker: entry.speaker,
    text: entry.text,
    isFinal: entry.isFinal ?? true,
    capturedAt: new Date().toISOString(),
  }));
}
