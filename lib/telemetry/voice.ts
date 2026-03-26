import {
  blobToDataUrl,
  getTrackingContext,
  postJsonWithContext,
  trackEventFireAndForget,
} from './browser';
import type {
  TranscriptTurnPayload,
  VoiceConsentPayload,
  VoiceErrorPayload,
  VoiceTokenResponse,
} from './shared';

export async function issueVoiceToken(
  voiceSessionId: string,
): Promise<VoiceTokenResponse> {
  return postJsonWithContext<VoiceTokenResponse>('/api/voice/token', {
    voiceSessionId,
  });
}

export async function startVoiceSession(
  consent: VoiceConsentPayload,
  options: {
    includeToken?: boolean;
  } = {},
) {
  let voiceSessionId = `vs_mock_${Date.now()}`;
  let token = '';
  let expiresAt: string | undefined;
  let newSessionExpiresAt: string | undefined;

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

    if (options.includeToken) {
      const tokenResponse = await issueVoiceToken(voiceSessionId);
      token = tokenResponse.token;
      expiresAt = tokenResponse.expiresAt;
      newSessionExpiresAt = tokenResponse.newSessionExpiresAt;
    }
  } catch (error) {
    console.warn(
      options.includeToken
        ? 'Voice session/token bootstrap failed'
        : 'Backend session start failed, using mock session ID for demo',
      error,
    );

    if (options.includeToken) {
      throw error;
    }

    // If we're local, we can continue with a mock ID for non-Live fallback paths.
  }

  trackEventFireAndForget('voice_session_initialized', {
    voiceSessionId,
  });

  return {
    voiceSessionId,
    token,
    expiresAt,
    newSessionExpiresAt,
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
  assetType: 'microphone' | 'assistant' | 'recording',
  blob: Blob,
  metadata: Record<string, unknown> = {},
) {
  if (!blob.size) {
    return;
  }

  const dataUrl = await blobToDataUrl(blob);

  const resp = await fetch('/api/voice/audio', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      voiceSessionId,
      assetType,
      mimeType: blob.type || 'audio/webm',
      dataUrl,
      metadata,
    }),
    // NOTE: no keepalive -base64 audio payloads exceed Chrome's 64KB keepalive limit
  });

  if (!resp.ok) {
    throw new Error(`Audio upload failed: ${resp.status} ${resp.statusText}`);
  }
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
  payload: Omit<VoiceErrorPayload, 'context'> & {
    context?: VoiceErrorPayload['context'];
  },
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
