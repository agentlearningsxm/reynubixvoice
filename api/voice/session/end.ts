import { waitUntil } from '@vercel/functions';
import type { VercelRequest, VercelResponse } from '@vercel/node';
import type { VoiceSessionEndPayload } from '../../../lib/telemetry/shared.js';
import { hasGoogleSheetsConfig } from '../../_lib/google-sheets.js';
import { readJsonBody, rejectMethod } from '../../_lib/http.js';
import { syncSessionToSheet } from '../../_lib/sheet-sync.js';
import { recordEvent, updateVoiceSession } from '../../_lib/telemetry.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (rejectMethod(req, res)) {
    return;
  }

  try {
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

    // Sync session data to Google Sheet in the background.
    // waitUntil() keeps the Vercel function alive until the promise resolves,
    // so the sheet sync completes even after the response is sent.
    if (hasGoogleSheetsConfig()) {
      waitUntil(
        syncSessionToSheet(payload.voiceSessionId).catch((err) =>
          console.error('[sheet-sync] Failed:', err),
        ),
      );
    }

    return res.status(200).json({ success: true });
  } catch (error) {
    console.error('Voice session end failed', error);
    return res.status(500).json({ error: 'Failed to finalize voice session' });
  }
}
