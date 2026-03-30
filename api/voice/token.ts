import { Modality } from '@google/genai';
import type { VercelRequest, VercelResponse } from '@vercel/node';
import type {
  VoiceTokenPayload,
  VoiceTokenResponse,
} from '../../lib/telemetry/shared.js';
import { GEMINI_LIVE_MODEL } from '../../lib/voice/models.js';
import { getGeminiLiveAdminClient } from '../_lib/gemini.js';
import { readJsonBody, rejectMethod } from '../_lib/http.js';
import { recordEvent, updateVoiceSession } from '../_lib/telemetry.js';

function isMockVoiceSessionId(voiceSessionId: string) {
  return voiceSessionId.startsWith('vs_mock_');
}

async function persistVoiceTokenTelemetry(input: {
  req: VercelRequest;
  voiceSessionId: string;
  expiresAt: string;
  newSessionExpiresAt: string;
}) {
  if (isMockVoiceSessionId(input.voiceSessionId)) {
    return;
  }

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

export function buildVoiceAuthTokenConfig(
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
      },
    },
  };
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (rejectMethod(req, res)) {
    return;
  }

  try {
    const payload = readJsonBody<VoiceTokenPayload>(req);
    if (!payload.voiceSessionId) {
      return res.status(400).json({ error: 'voiceSessionId is required' });
    }

    const ai = getGeminiLiveAdminClient();
    const expiresAt = new Date(Date.now() + 30 * 60 * 1000).toISOString();
    const newSessionExpiresAt = new Date(Date.now() + 60 * 1000).toISOString();
    const token = await ai.authTokens.create({
      config: buildVoiceAuthTokenConfig(expiresAt, newSessionExpiresAt),
    });

    await persistVoiceTokenTelemetry({
      req,
      voiceSessionId: payload.voiceSessionId,
      expiresAt,
      newSessionExpiresAt,
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
