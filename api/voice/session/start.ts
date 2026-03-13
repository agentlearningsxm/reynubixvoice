import type { VercelRequest, VercelResponse } from '@vercel/node';
import type {
  VoiceSessionStartPayload,
  VoiceSessionStartResponse,
} from '../../../lib/telemetry/shared';
import { readJsonBody, rejectMethod } from '../../_lib/http';
import { createVoiceSession, recordEvent } from '../../_lib/telemetry';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (rejectMethod(req, res)) {
    return;
  }

  try {
    const payload = readJsonBody<VoiceSessionStartPayload>(req);

    if (!payload.consent?.accepted) {
      return res.status(400).json({ error: 'Recording consent is required' });
    }

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
      properties: {
        consentVersion: payload.consent.version,
      },
    });

    const responseBody: VoiceSessionStartResponse = {
      voiceSessionId: voiceSession.voiceSessionId,
    };

    return res.status(200).json(responseBody);
  } catch (error) {
    console.error('Voice session start failed', error);
    return res.status(500).json({ error: 'Failed to create voice session' });
  }
}
