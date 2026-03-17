export type VoiceSpeaker = 'ai' | 'human';

export interface TrackingContextInput {
  visitorId?: string;
  sessionId?: string;
  leadId?: string | null;
  pagePath?: string;
  pageTitle?: string;
  referrer?: string | null;
  timezone?: string;
  language?: string;
  utm?: Record<string, string | null | undefined>;
}

export interface EventIngestPayload {
  eventName: string;
  context: TrackingContextInput;
  leadId?: string | null;
  voiceSessionId?: string | null;
  properties?: Record<string, unknown>;
  occurredAt?: string;
}

export interface ContactSubmitPayload {
  context: TrackingContextInput;
  name: string;
  email: string;
  phone: string;
  company?: string;
  message: string;
}

export interface VoiceConsentPayload {
  accepted: boolean;
  acceptedAt: string;
  version: string;
}

export interface VoiceSessionStartPayload {
  context: TrackingContextInput;
  consent: VoiceConsentPayload;
  metadata?: Record<string, unknown>;
}

export interface VoiceSessionStartResponse {
  voiceSessionId: string;
}

export interface VoiceTokenPayload {
  voiceSessionId: string;
}

export interface VoiceTokenResponse {
  token: string;
  expiresAt?: string;
  newSessionExpiresAt?: string;
}

export interface TranscriptTurnPayload {
  turnIndex: number;
  speaker: VoiceSpeaker;
  text: string;
  isFinal: boolean;
  capturedAt: string;
  metadata?: Record<string, unknown>;
}

export interface VoiceTranscriptPayload {
  voiceSessionId: string;
  turns: TranscriptTurnPayload[];
}

export interface VoiceAudioUploadPayload {
  voiceSessionId: string;
  assetType: 'microphone' | 'assistant';
  mimeType: string;
  dataUrl: string;
  durationMs?: number;
  metadata?: Record<string, unknown>;
}

export interface VoiceToolCallPayload {
  voiceSessionId: string;
  callId: string;
  toolName: string;
  args?: Record<string, unknown>;
  result?: Record<string, unknown>;
  capturedAt: string;
}

export interface VoiceErrorPayload {
  context?: TrackingContextInput;
  voiceSessionId?: string;
  scope: string;
  errorCode?: string;
  message: string;
  severity?: 'info' | 'warning' | 'error';
  metadata?: Record<string, unknown>;
  occurredAt?: string;
}

export interface VoiceSessionEndPayload {
  context: TrackingContextInput;
  voiceSessionId: string;
  status: 'completed' | 'cancelled' | 'failed';
  endedAt: string;
  durationMs?: number;
  transcriptText?: string;
  metadata?: Record<string, unknown>;
}

export const VISITOR_STORAGE_KEY = 'reynubixvoice.visitor-id';
export const SESSION_STORAGE_KEY = 'reynubixvoice.session-id';
export const LEAD_STORAGE_KEY = 'reynubixvoice.lead-id';

export function createPublicId(prefix: string) {
  const random = Math.random().toString(36).slice(2, 10);
  return `${prefix}_${Date.now().toString(36)}_${random}`;
}

export function sanitizeEventName(eventName: string) {
  return eventName
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9:_-]+/g, '_');
}

export function sanitizeText(
  value: string | null | undefined,
  maxLength = 3000,
) {
  if (!value) return '';
  return value.trim().slice(0, maxLength);
}

export function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

export function readUtmParams(url: URL) {
  const params = [
    'utm_source',
    'utm_medium',
    'utm_campaign',
    'utm_term',
    'utm_content',
  ];
  return params.reduce<Record<string, string>>((acc, key) => {
    const value = url.searchParams.get(key);
    if (value) {
      acc[key] = value;
    }
    return acc;
  }, {});
}

export function parseDataUrl(dataUrl: string) {
  const match = dataUrl.match(/^data:(.+);base64,(.+)$/);
  if (!match) {
    throw new Error('Invalid audio payload');
  }

  return {
    mimeType: match[1],
    base64: match[2],
  };
}

export function guessFileExtension(mimeType: string) {
  if (mimeType.includes('webm')) return 'webm';
  if (mimeType.includes('ogg')) return 'ogg';
  if (mimeType.includes('wav')) return 'wav';
  if (mimeType.includes('mp4')) return 'm4a';
  return 'bin';
}
