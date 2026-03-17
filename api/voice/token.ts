import type { VercelRequest, VercelResponse } from '@vercel/node';
import type {
  VoiceTokenPayload,
  VoiceTokenResponse,
} from '../../lib/telemetry/shared.js';
import { getGeminiAdminClient } from '../_lib/gemini.js';
import { readJsonBody, rejectMethod } from '../_lib/http.js';
import { recordEvent, updateVoiceSession } from '../_lib/telemetry.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (rejectMethod(req, res)) {
    return;
  }

  try {
    const payload = readJsonBody<VoiceTokenPayload>(req);
    if (!payload.voiceSessionId) {
      return res.status(400).json({ error: 'voiceSessionId is required' });
    }

    const ai = getGeminiAdminClient();
    const expiresAt = new Date(Date.now() + 30 * 60 * 1000).toISOString();
    const newSessionExpiresAt = new Date(Date.now() + 60 * 1000).toISOString();
    const token = await ai.authTokens.create({
      config: {
        uses: 1,
        expireTime: expiresAt,
        newSessionExpireTime: newSessionExpiresAt,
      },
    });

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
        newSessionExpiresAt,
      },
    });

    const responseBody: VoiceTokenResponse = {
      token: token.name ?? '',
      expiresAt,
      newSessionExpiresAt,
    };

    return res.status(200).json(responseBody);
  } catch (error) {
    console.error('Voice token issuance failed', error);
    return res.status(500).json({ error: 'Failed to issue voice token' });
  }
}
