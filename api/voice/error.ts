import type { VercelRequest, VercelResponse } from '@vercel/node';
import type { VoiceErrorPayload } from '../../lib/telemetry/shared.js';
import { readJsonBody, rejectMethod } from '../_lib/http.js';
import { recordError, recordEvent } from '../_lib/telemetry.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (rejectMethod(req, res)) {
    return;
  }

  try {
    const payload = readJsonBody<VoiceErrorPayload>(req);
    if (!payload.message || !payload.scope) {
      return res.status(400).json({ error: 'scope and message are required' });
    }

    await recordError({
      req,
      context: payload.context,
      voiceSessionId: payload.voiceSessionId,
      scope: payload.scope,
      message: payload.message,
      errorCode: payload.errorCode,
      severity: payload.severity,
      metadata: payload.metadata,
      occurredAt: payload.occurredAt,
    });

    await recordEvent({
      req,
      eventName: 'voice_error_recorded',
      context: payload.context,
      voiceSessionId: payload.voiceSessionId ?? null,
      properties: {
        scope: payload.scope,
        errorCode: payload.errorCode,
        severity: payload.severity ?? 'error',
      },
      occurredAt: payload.occurredAt,
    });

    return res.status(200).json({ success: true });
  } catch (error) {
    console.error('Voice error ingest failed', error);
    return res.status(500).json({ error: 'Failed to record voice error' });
  }
}
