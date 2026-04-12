import { createHash } from 'node:crypto';
import { Modality } from '@google/genai';
// waitUntil is Vercel-only; using setImmediate for Express compatibility
import type { VercelRequest, VercelResponse } from '@vercel/node';
import type {
  VoiceAudioUploadPayload,
  VoiceSessionEndPayload,
  VoiceSessionStartPayload,
  VoiceSessionStartResponse,
  VoiceTokenPayload,
  VoiceTokenResponse,
} from '../../lib/telemetry/shared.js';
import {
  guessFileExtension,
  parseDataUrl,
} from '../../lib/telemetry/shared.js';
import { REYNA_GEMINI_VOICE } from '../../lib/voice/liveConfig.js';
import { GEMINI_LIVE_MODEL } from '../../lib/voice/models.js';
import { analyzeAndStoreSession } from '../_lib/call-analytics.js';
import { getGeminiLiveAdminClient } from '../_lib/gemini.js';
import { readJsonBody, rejectMethod } from '../_lib/http.js';
import { getSupabaseAdmin } from '../_lib/supabaseAdmin.js';
import {
  createVoiceSession,
  getVoiceSessionByPublicId,
  recordEvent,
  updateVoiceSession,
} from '../_lib/telemetry.js';

function isMockVoiceSessionId(voiceSessionId: string) {
  return voiceSessionId.startsWith('vs_mock_');
}

async function persistVoiceTokenTelemetry(input: {
  req: VercelRequest;
  voiceSessionId: string;
  expiresAt: string;
  newSessionExpiresAt: string;
}) {
  if (isMockVoiceSessionId(input.voiceSessionId)) return;
  try {
    await updateVoiceSession(input.voiceSessionId, {
      status: 'token_issued',
      updated_at: new Date().toISOString(),
    });
    await recordEvent({
      req: input.req,
      eventName: 'voice_token_issued',
      voiceSessionId: input.voiceSessionId,
      properties: {
        expiresAt: input.expiresAt,
        model: GEMINI_LIVE_MODEL,
        newSessionExpiresAt: input.newSessionExpiresAt,
      },
    });
  } catch (telemetryError) {
    console.warn(
      '[voice-token] Token issued but telemetry persistence failed:',
      telemetryError,
    );
  }
}

function buildVoiceAuthTokenConfig(
  expiresAt: string,
  newSessionExpiresAt: string,
) {
  return {
    uses: 1,
    expireTime: expiresAt,
    newSessionExpireTime: newSessionExpiresAt,
    liveConnectConstraints: {
      model: GEMINI_LIVE_MODEL,
      config: {
        responseModalities: [Modality.AUDIO],
        sessionResumption: {},
        speechConfig: {
          voiceConfig: {
            prebuiltVoiceConfig: { voiceName: REYNA_GEMINI_VOICE },
          },
        },
        contextWindowCompression: { slidingWindow: {} },
      },
    },
  };
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (rejectMethod(req, res)) return;

  const path = (req.query.path as string[]) || [];
  const [resource, subResource] = path;

  try {
    // POST /api/voice/token
    if (resource === 'token') {
      const payload = readJsonBody<VoiceTokenPayload>(req);
      if (!payload.voiceSessionId)
        return res.status(400).json({ error: 'voiceSessionId is required' });

      const expiresAt = new Date(Date.now() + 30 * 60 * 1000).toISOString();
      const newSessionExpiresAt = new Date(
        Date.now() + 60 * 1000,
      ).toISOString();

      // ── Strategy 1: Ephemeral token (most secure — constrains model/voice) ──
      let tokenValue: string | null = null;
      try {
        const ai = getGeminiLiveAdminClient();
        const ephemeral = await ai.authTokens.create({
          config: buildVoiceAuthTokenConfig(expiresAt, newSessionExpiresAt),
        });
        tokenValue = ephemeral.name ?? null;
        if (!tokenValue) throw new Error('authTokens.create returned empty token.name');
        console.log('[voice/token] Ephemeral token issued successfully.');
      } catch (ephemeralError) {
        // ── Strategy 2: Raw API key fallback ────────────────────────────────
        // authTokens.create() can fail when:
        //   - The model name is not yet available in this API region
        //   - The API key doesn't have authTokens permission
        //   - A transient Google API error
        // In that case, return the raw GEMINI_API_KEY so Reyna can still connect.
        // The client will use it as apiKey directly with GoogleGenAI.
        console.warn(
          '[voice/token] authTokens.create() failed — falling back to raw API key mode.',
          '\nError:', ephemeralError instanceof Error ? ephemeralError.message : String(ephemeralError),
        );
        const rawKey = process.env.GEMINI_API_KEY;
        if (!rawKey) {
          console.error('[voice/token] GEMINI_API_KEY is not set in environment.');
          return res.status(500).json({
            error: 'Voice service not configured — GEMINI_API_KEY missing on server.',
          });
        }
        tokenValue = rawKey;
        console.log('[voice/token] Using raw API key fallback. Consider checking model name or API key permissions.');
      }

      await persistVoiceTokenTelemetry({
        req,
        voiceSessionId: payload.voiceSessionId,
        expiresAt,
        newSessionExpiresAt,
      });

      const responseBody: VoiceTokenResponse = {
        token: tokenValue,
        expiresAt,
        newSessionExpiresAt,
      };
      return res.status(200).json(responseBody);
    }

    // POST /api/voice/audio
    if (resource === 'audio') {
      const payload = readJsonBody<VoiceAudioUploadPayload>(req);
      if (
        !payload.voiceSessionId ||
        !payload.mimeType ||
        !payload.dataUrl ||
        !payload.assetType
      ) {
        return res.status(400).json({
          error: 'voiceSessionId, assetType, mimeType and dataUrl are required',
        });
      }
      const parsed = parseDataUrl(payload.dataUrl);
      const mimeType = payload.mimeType || parsed.mimeType;
      const buffer = Buffer.from(parsed.base64, 'base64');
      const maxBytes = Number(
        process.env.VOICE_AUDIO_MAX_BYTES || 25 * 1024 * 1024,
      );
      if (buffer.length > maxBytes)
        return res.status(413).json({ error: 'Audio payload is too large' });
      const checksum = createHash('sha256').update(buffer).digest('hex');
      const extension = guessFileExtension(mimeType);
      const bucket =
        process.env.SUPABASE_STORAGE_BUCKET_VOICE_AUDIO ||
        'voice-session-audio';
      const voiceSession = await getVoiceSessionByPublicId(
        payload.voiceSessionId,
      );
      const storagePath = `${payload.voiceSessionId}/${payload.assetType}-${Date.now()}.${extension}`;
      const supabase = getSupabaseAdmin();
      const { error: uploadError } = await supabase.storage
        .from(bucket)
        .upload(storagePath, buffer, { contentType: mimeType, upsert: false });
      if (uploadError) throw uploadError;
      const { error: insertError } = await supabase
        .from('voice_audio_assets')
        .insert({
          voice_session_id: voiceSession.id,
          asset_type: payload.assetType,
          storage_bucket: bucket,
          storage_path: storagePath,
          mime_type: mimeType,
          byte_size: buffer.length,
          duration_ms: payload.durationMs ?? null,
          checksum,
          metadata: payload.metadata ?? {},
        });
      if (insertError) throw insertError;
      await updateVoiceSession(payload.voiceSessionId, {
        audio_status: 'uploaded',
      });
      await recordEvent({
        req,
        eventName: 'voice_audio_uploaded',
        voiceSessionId: payload.voiceSessionId,
        properties: {
          assetType: payload.assetType,
          byteSize: buffer.length,
          durationMs: payload.durationMs ?? null,
        },
      });
      return res
        .status(200)
        .json({ success: true, bucket, path: storagePath, checksum });
    }

    // POST /api/voice/transcript
    if (resource === 'transcript') {
      const payload = readJsonBody<Record<string, unknown>>(req);
      if (!payload.voiceSessionId)
        return res.status(400).json({ error: 'voiceSessionId is required' });
      await recordEvent({
        req,
        eventName: 'voice_transcript',
        voiceSessionId: payload.voiceSessionId as string,
        properties: {
          isFinal: payload.isFinal,
          text: (payload.text as string)?.slice(0, 1000),
        },
      });
      return res.status(200).json({ success: true });
    }

    // POST /api/voice/tool-call
    if (resource === 'tool-call') {
      const payload = readJsonBody<Record<string, unknown>>(req);
      if (!payload.voiceSessionId)
        return res.status(400).json({ error: 'voiceSessionId is required' });
      await recordEvent({
        req,
        eventName: 'voice_tool_call',
        voiceSessionId: payload.voiceSessionId as string,
        properties: { toolName: payload.toolName, args: payload.args },
      });
      return res.status(200).json({ success: true });
    }

    // POST /api/voice/error
    if (resource === 'error') {
      const payload = readJsonBody<Record<string, unknown>>(req);
      if (!payload.voiceSessionId)
        return res.status(400).json({ error: 'voiceSessionId is required' });
      await recordEvent({
        req,
        eventName: 'voice_error',
        voiceSessionId: payload.voiceSessionId as string,
        properties: {
          message: (payload.message as string)?.slice(0, 1000),
          severity: payload.severity,
        },
      });
      return res.status(200).json({ success: true });
    }

    // POST /api/voice/session/start
    if (resource === 'session' && subResource === 'start') {
      const payload = readJsonBody<VoiceSessionStartPayload>(req);
      if (!payload.consent?.accepted)
        return res.status(400).json({ error: 'Recording consent is required' });
      const voiceSession = await createVoiceSession({
        req,
        context: payload.context,
        consent: payload.consent,
        metadata: payload.metadata,
      });
      await recordEvent({
        req,
        eventName: 'voice_session_created',
        context: payload.context,
        voiceSessionId: voiceSession.voiceSessionId,
        properties: { consentVersion: payload.consent.version },
      });
      const responseBody: VoiceSessionStartResponse = {
        voiceSessionId: voiceSession.voiceSessionId,
      };
      return res.status(200).json(responseBody);
    }

    // POST /api/voice/session/end
    if (resource === 'session' && subResource === 'end') {
      const payload = readJsonBody<VoiceSessionEndPayload>(req);
      if (!payload.voiceSessionId || !payload.status || !payload.endedAt) {
        return res
          .status(400)
          .json({ error: 'voiceSessionId, status and endedAt are required' });
      }
      await updateVoiceSession(payload.voiceSessionId, {
        status: payload.status,
        ended_at: payload.endedAt,
        duration_ms: payload.durationMs ?? null,
        summary: payload.transcriptText?.slice(0, 4000) ?? null,
        metadata: payload.metadata ?? {},
      });
      await recordEvent({
        req,
        eventName: 'voice_session_ended',
        context: payload.context,
        voiceSessionId: payload.voiceSessionId,
        properties: {
          status: payload.status,
          durationMs: payload.durationMs ?? null,
        },
        occurredAt: payload.endedAt,
      });
      setImmediate(() => {
      analyzeAndStoreSession(payload.voiceSessionId).catch((err) =>
      console.error('[call-analytics] Failed:', err),
      );
      });
      return res.status(200).json({ success: true });
    }

    res.status(404).json({ error: 'Voice route not found' });
  } catch (error) {
    console.error('Voice API error', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
