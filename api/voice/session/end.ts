import type { VercelRequest, VercelResponse } from '@vercel/node';
import type { VoiceSessionEndPayload } from '../../../lib/telemetry/shared';
import { readJsonBody, rejectMethod } from '../../_lib/http';
import { recordEvent, updateVoiceSession } from '../../_lib/telemetry';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (rejectMethod(req, res)) {
    return;
  }

  try {
    const payload = readJsonBody<VoiceSessionEndPayload>(req);

    if (!payload.voiceSessionId || !payload.status || !payload.endedAt) {
      return res.status(400).json({ error: 'voiceSessionId, status and endedAt are required' });
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

    return res.status(200).json({ success: true });
  } catch (error) {
    console.error('Voice session end failed', error);
    return res.status(500).json({ error: 'Failed to finalize voice session' });
  }
}
