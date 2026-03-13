import {
  type TranscriptTurnPayload,
  type VoiceConsentPayload,
  type VoiceErrorPayload,
} from './shared';
import { blobToDataUrl, getTrackingContext, postJsonWithContext, trackEventFireAndForget } from './browser';

export async function startVoiceSession(consent: VoiceConsentPayload) {
  let voiceSessionId = `vs_mock_${Date.now()}`;
  try {
    const session = await postJsonWithContext<{ voiceSessionId: string }>(
      '/api/voice/session/start',
      {
        consent,
        metadata: {
          userAgent: navigator.userAgent,
          platform: navigator.platform,
        },
      },
    );
    voiceSessionId = session.voiceSessionId;
  } catch (error) {
    console.warn('Backend session start failed, using mock session ID for demo', error);
    // If we're local, we can continue with a mock ID
  }

  const token = import.meta.env.VITE_GEMINI_API_KEY || '';

  trackEventFireAndForget('voice_session_initialized', {
    voiceSessionId,
  });

  return {
    voiceSessionId,
    token,
    expiresAt: undefined,
    newSessionExpiresAt: undefined,
  };
}

export function syncVoiceTranscript(
  voiceSessionId: string,
  turns: TranscriptTurnPayload[],
) {
  return fetch('/api/voice/transcript', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      voiceSessionId,
      turns,
    }),
    keepalive: true,
  });
}

export async function uploadVoiceAudio(
  voiceSessionId: string,
  assetType: 'microphone' | 'assistant',
  blob: Blob,
  metadata: Record<string, unknown> = {},
) {
  if (!blob.size) {
    return;
  }

  const dataUrl = await blobToDataUrl(blob);

  await fetch('/api/voice/audio', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      voiceSessionId,
      assetType,
      mimeType: blob.type || 'audio/webm',
      dataUrl,
      metadata,
    }),
  });
}

export function recordVoiceToolCall(input: {
  voiceSessionId: string;
  callId: string;
  toolName: string;
  args?: Record<string, unknown>;
  result?: Record<string, unknown>;
}) {
  return fetch('/api/voice/tool-call', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      ...input,
      capturedAt: new Date().toISOString(),
    }),
    keepalive: true,
  });
}

export function recordVoiceError(
  payload: Omit<VoiceErrorPayload, 'context'> & { context?: VoiceErrorPayload['context'] },
) {
  return fetch('/api/voice/error', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      ...payload,
      context: payload.context ?? getTrackingContext(),
      occurredAt: payload.occurredAt ?? new Date().toISOString(),
    }),
    keepalive: true,
  });
}

export function endVoiceSession(input: {
  voiceSessionId: string;
  status: 'completed' | 'cancelled' | 'failed';
  durationMs?: number;
  transcriptText?: string;
  metadata?: Record<string, unknown>;
}) {
  return fetch('/api/voice/session/end', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      voiceSessionId: input.voiceSessionId,
      context: getTrackingContext(),
      status: input.status,
      endedAt: new Date().toISOString(),
      durationMs: input.durationMs,
      transcriptText: input.transcriptText,
      metadata: input.metadata ?? {},
    }),
    keepalive: true,
  });
}
