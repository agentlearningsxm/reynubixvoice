import type { VercelRequest, VercelResponse } from '@vercel/node';
import { normalizeEmail } from '../../lib/telemetry/shared.js';
import { readJsonBody, rejectMethod } from '../_lib/http.js';
import { getSupabaseAdmin } from '../_lib/supabaseAdmin.js';

function resolveBookingMetadata(payload: Record<string, unknown>) {
  const data = payload.data as Record<string, unknown> | undefined;
  const attendee = data?.attendee as Record<string, unknown> | undefined;
  const responses = data?.responses as Record<string, unknown> | undefined;

  const bookingId =
    (payload.bookingId as string) ||
    (payload.uid as string) ||
    (payload.id as string) ||
    (data?.uid as string) ||
    (data?.bookingId as string) ||
    null;

  const eventType =
    (payload.triggerEvent as string) ||
    (payload.eventType as string) ||
    (payload.type as string) ||
    (payload.event as string) ||
    'unknown';

  const attendeeEmail =
    (payload.email as string) ||
    (attendee?.email as string) ||
    (data?.email as string) ||
    (attendee?.email as string) ||
    (responses?.email as string) ||
    null;

  return {
    bookingId,
    eventType,
    attendeeEmail,
  };
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (rejectMethod(req, res)) {
    return;
  }

  try {
    const payload = readJsonBody<Record<string, unknown>>(req);
    const supabase = getSupabaseAdmin();
    const bookingMeta = resolveBookingMetadata(payload);

    let leadId: string | null = null;
    if (bookingMeta.attendeeEmail) {
      const { data: lead } = await supabase
        .from('leads')
        .select('id')
        .eq('email_normalized', normalizeEmail(bookingMeta.attendeeEmail))
        .maybeSingle();

      leadId = lead?.id ?? null;
    }

    await supabase.from('bookings').insert({
      lead_id: leadId,
      provider: 'cal',
      provider_booking_id: bookingMeta.bookingId,
      status:
        bookingMeta.eventType === 'BOOKING_CANCELLED' ? 'cancelled' : 'booked',
      event_type: bookingMeta.eventType,
      payload,
    });

    return res.status(200).json({ success: true });
  } catch (error) {
    console.error('Cal webhook ingest failed', error);
    return res.status(500).json({ error: 'Failed to process Cal webhook' });
  }
}
