import type { VercelRequest, VercelResponse } from '@vercel/node';
import type { EventIngestPayload } from '../lib/telemetry/shared.js';
import { readJsonBody, rejectMethod } from './_lib/http.js';
import { recordEvent } from './_lib/telemetry.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (rejectMethod(req, res)) {
    return;
  }

  try {
    const payload = readJsonBody<EventIngestPayload>(req);

    if (!payload?.eventName) {
      return res.status(400).json({ error: 'eventName is required' });
    }

    await recordEvent({
      req,
      eventName: payload.eventName,
      context: payload.context,
      leadId: payload.leadId,
      voiceSessionId: payload.voiceSessionId,
      properties: payload.properties,
      occurredAt: payload.occurredAt,
    });

    return res.status(200).json({ success: true });
  } catch (error) {
    console.error('Event ingest failed', error);
    return res.status(500).json({ error: 'Failed to capture event' });
  }
}
