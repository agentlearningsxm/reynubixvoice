import type { VercelRequest, VercelResponse } from '@vercel/node';
import { readJsonBody, rejectMethod } from './_lib/http.js';
import { recordEvent } from './_lib/telemetry.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (rejectMethod(req, res)) return;

  try {
    const payload = readJsonBody<Record<string, unknown>>(req);
    if (!payload.voiceSessionId)
      return res.status(400).json({ error: 'voiceSessionId is required' });

    const eventType = (payload.eventType as string) || 'voice_transcript';

    await recordEvent({
      req,
      eventName: eventType,
      voiceSessionId: payload.voiceSessionId as string,
      properties:
        eventType === 'voice_transcript'
          ? {
              isFinal: payload.isFinal,
              text: (payload.text as string)?.slice(0, 1000),
            }
          : eventType === 'voice_error'
            ? {
                message: (payload.message as string)?.slice(0, 1000),
                severity: payload.severity,
              }
            : { toolName: payload.toolName, args: payload.args },
    });

    return res.status(200).json({ success: true });
  } catch (error) {
    console.error('Voice API error', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
