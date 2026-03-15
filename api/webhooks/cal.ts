import type { VercelRequest, VercelResponse } from '@vercel/node';
import { normalizeEmail } from '../../lib/telemetry/shared';
import { readJsonBody, rejectMethod } from '../_lib/http';
import { getSupabaseAdmin } from '../_lib/supabaseAdmin';

function resolveBookingMetadata(payload: Record<string, any>) {
  const bookingId =
    payload.bookingId ||
    payload.uid ||
    payload.id ||
    payload.data?.uid ||
    payload.data?.bookingId ||
    null;

  const eventType =
    payload.triggerEvent ||
    payload.eventType ||
    payload.type ||
    payload.event ||
    'unknown';

  const attendeeEmail =
    payload.email ||
    payload.attendee?.email ||
    payload.data?.email ||
    payload.data?.attendee?.email ||
    payload.data?.responses?.email ||
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
    const payload = readJsonBody<Record<string, any>>(req);
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
