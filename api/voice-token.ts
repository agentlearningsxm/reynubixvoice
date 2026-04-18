import type { VercelRequest, VercelResponse } from '@vercel/node';
import type {
  VoiceTokenPayload,
  VoiceTokenResponse,
} from '../lib/telemetry/shared.js';
import { GEMINI_LIVE_MODEL } from '../lib/voice/models.js';
import { readJsonBody, rejectMethod } from './_lib/http.js';
import { recordEvent, updateVoiceSession } from './_lib/telemetry.js';

function isMockVoiceSessionId(voiceSessionId: string) {
  return voiceSessionId.startsWith('vs_mock_');
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (rejectMethod(req, res)) return;

  try {
    const payload = readJsonBody<VoiceTokenPayload>(req);
    if (!payload.voiceSessionId)
      return res.status(400).json({ error: 'voiceSessionId is required' });

    const expiresAt = new Date(Date.now() + 30 * 60 * 1000).toISOString();
    const newSessionExpiresAt = new Date(Date.now() + 60 * 1000).toISOString();

    // Use raw API key directly — ephemeral auth tokens cause immediate WebSocket
    // close (code 1000) with gemini-3.1-flash-live-preview despite being issued.
    // Trim to defend against Vercel env newline corruption (observed on sibling vars).
    const rawKey = process.env.GEMINI_API_KEY?.trim();
    if (!rawKey) {
      console.error('[voice/token] GEMINI_API_KEY is not set in environment.');
      return res.status(500).json({
        error:
          'Voice service not configured — GEMINI_API_KEY missing on server.',
      });
    }
    const tokenValue = rawKey;
    console.log('[voice/token] Using raw API key (len:', rawKey.length, ').');

    if (!isMockVoiceSessionId(payload.voiceSessionId)) {
      try {
        await updateVoiceSession(payload.voiceSessionId, {
          status: 'token_issued',
          updated_at: new Date().toISOString(),
        });
        await recordEvent({
          req,
          eventName: 'voice_token_issued',
          voiceSessionId: payload.voiceSessionId,
          properties: {
            expiresAt,
            model: GEMINI_LIVE_MODEL,
            newSessionExpiresAt,
          },
        });
      } catch (telemetryError) {
        console.warn(
          '[voice-token] Telemetry persistence failed:',
          telemetryError,
        );
      }
    }

    const responseBody: VoiceTokenResponse = {
      token: tokenValue,
      expiresAt,
      newSessionExpiresAt,
    };
    return res.status(200).json(responseBody);
  } catch (error) {
    console.error('Voice API error', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
