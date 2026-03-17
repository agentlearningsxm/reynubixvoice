import type { VercelRequest, VercelResponse } from '@vercel/node';
import type { VoiceTranscriptPayload } from '../../lib/telemetry/shared.js';
import { readJsonBody, rejectMethod } from '../_lib/http.js';
import {
  recordEvent,
  updateVoiceSession,
  upsertTranscriptTurns,
} from '../_lib/telemetry.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (rejectMethod(req, res)) {
    return;
  }

  try {
    const payload = readJsonBody<VoiceTranscriptPayload>(req);

    if (!payload.voiceSessionId || !payload.turns?.length) {
      return res
        .status(400)
        .json({ error: 'voiceSessionId and turns are required' });
    }

    await upsertTranscriptTurns(payload.voiceSessionId, payload.turns);
    await updateVoiceSession(payload.voiceSessionId, {
      status: 'active',
      connected_at: new Date().toISOString(),
    });

    await recordEvent({
      req,
      eventName: 'voice_transcript_synced',
      voiceSessionId: payload.voiceSessionId,
      properties: {
        turnCount: payload.turns.length,
        finalCount: payload.turns.filter((turn) => turn.isFinal).length,
      },
    });

    return res.status(200).json({ success: true });
  } catch (error) {
    console.error('Transcript sync failed', error);
    return res.status(500).json({ error: 'Failed to sync transcript' });
  }
}
