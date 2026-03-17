import type { VercelRequest, VercelResponse } from '@vercel/node';
import type { VoiceToolCallPayload } from '../../lib/telemetry/shared.js';
import { readJsonBody, rejectMethod } from '../_lib/http.js';
import { recordEvent, recordVoiceToolCall } from '../_lib/telemetry.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (rejectMethod(req, res)) {
    return;
  }

  try {
    const payload = readJsonBody<VoiceToolCallPayload>(req);
    if (!payload.voiceSessionId || !payload.toolName || !payload.callId) {
      return res
        .status(400)
        .json({ error: 'voiceSessionId, callId and toolName are required' });
    }

    await recordVoiceToolCall(payload);
    await recordEvent({
      req,
      eventName: 'voice_tool_call',
      voiceSessionId: payload.voiceSessionId,
      properties: {
        callId: payload.callId,
        toolName: payload.toolName,
        args: payload.args ?? {},
      },
      occurredAt: payload.capturedAt,
    });

    return res.status(200).json({ success: true });
  } catch (error) {
    console.error('Voice tool-call ingest failed', error);
    return res.status(500).json({ error: 'Failed to record tool call' });
  }
}
