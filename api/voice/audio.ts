import { createHash } from 'node:crypto';
import type { VercelRequest, VercelResponse } from '@vercel/node';
import type { VoiceAudioUploadPayload } from '../../lib/telemetry/shared';
import { guessFileExtension, parseDataUrl } from '../../lib/telemetry/shared';
import { readJsonBody, rejectMethod } from '../_lib/http';
import { getSupabaseAdmin } from '../_lib/supabaseAdmin';
import { getVoiceSessionByPublicId, recordEvent, updateVoiceSession } from '../_lib/telemetry';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (rejectMethod(req, res)) {
    return;
  }

  try {
    const payload = readJsonBody<VoiceAudioUploadPayload>(req);
    if (!payload.voiceSessionId || !payload.mimeType || !payload.dataUrl || !payload.assetType) {
      return res.status(400).json({ error: 'voiceSessionId, assetType, mimeType and dataUrl are required' });
    }

    const parsed = parseDataUrl(payload.dataUrl);
    const mimeType = payload.mimeType || parsed.mimeType;
    const buffer = Buffer.from(parsed.base64, 'base64');
    const maxBytes = Number(process.env.VOICE_AUDIO_MAX_BYTES || 25 * 1024 * 1024);

    if (buffer.length > maxBytes) {
      return res.status(413).json({ error: 'Audio payload is too large' });
    }

    const checksum = createHash('sha256').update(buffer).digest('hex');
    const extension = guessFileExtension(mimeType);
    const bucket = process.env.SUPABASE_STORAGE_BUCKET_VOICE_AUDIO || 'voice-session-audio';
    const voiceSession = await getVoiceSessionByPublicId(payload.voiceSessionId);
    const storagePath = `${payload.voiceSessionId}/${payload.assetType}-${Date.now()}.${extension}`;
    const supabase = getSupabaseAdmin();

    const { error: uploadError } = await supabase.storage
      .from(bucket)
      .upload(storagePath, buffer, {
        contentType: mimeType,
        upsert: false,
      });

    if (uploadError) {
      throw uploadError;
    }

    const { error: insertError } = await supabase.from('voice_audio_assets').insert({
      voice_session_id: voiceSession.id,
      asset_type: payload.assetType,
      storage_bucket: bucket,
      storage_path: storagePath,
      mime_type: mimeType,
      byte_size: buffer.length,
      duration_ms: payload.durationMs ?? null,
      checksum,
      metadata: payload.metadata ?? {},
    });

    if (insertError) {
      throw insertError;
    }

    await updateVoiceSession(payload.voiceSessionId, {
      audio_status: 'uploaded',
    });

    await recordEvent({
      req,
      eventName: 'voice_audio_uploaded',
      voiceSessionId: payload.voiceSessionId,
      properties: {
        assetType: payload.assetType,
        byteSize: buffer.length,
        durationMs: payload.durationMs ?? null,
      },
    });

    return res.status(200).json({
      success: true,
      bucket,
      path: storagePath,
      checksum,
    });
  } catch (error) {
    console.error('Voice audio upload failed', error);
    return res.status(500).json({ error: 'Failed to upload audio' });
  }
}
