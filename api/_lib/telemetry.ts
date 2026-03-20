import { randomUUID } from 'node:crypto';
import type { VercelRequest } from '@vercel/node';
import type {
  TrackingContextInput,
  TranscriptTurnPayload,
  VoiceConsentPayload,
} from '../../lib/telemetry/shared.js';
import {
  normalizeEmail,
  sanitizeEventName,
  sanitizeText,
} from '../../lib/telemetry/shared.js';
import { getClientIp, hashIp } from './http.js';
import { getSupabaseAdmin } from './supabaseAdmin.js';

type JsonObject = Record<string, unknown>;

function cleanValue(value: string | null | undefined, maxLength = 512) {
  const nextValue = value?.trim();
  return nextValue ? nextValue.slice(0, maxLength) : null;
}

function getAttribution(context: TrackingContextInput = {}) {
  const utm = context.utm ?? {};
  return {
    page_path: cleanValue(context.pagePath, 2048),
    page_title: cleanValue(context.pageTitle, 512),
    referrer: cleanValue(context.referrer ?? undefined, 2048),
    timezone: cleanValue(context.timezone, 128),
    language: cleanValue(context.language, 64),
    utm_source: cleanValue(utm.utm_source, 256),
    utm_medium: cleanValue(utm.utm_medium, 256),
    utm_campaign: cleanValue(utm.utm_campaign, 256),
    utm_term: cleanValue(utm.utm_term, 256),
    utm_content: cleanValue(utm.utm_content, 256),
  };
}

export async function ensureTrackingEntities(
  req: VercelRequest,
  context: TrackingContextInput = {},
) {
  const supabase = getSupabaseAdmin();
  const now = new Date().toISOString();
  const attribution = getAttribution(context);
  const anonymousId = context.visitorId?.trim() || `visitor_${randomUUID()}`;
  const sessionKey = context.sessionId?.trim() || `session_${randomUUID()}`;
  const ipHash = hashIp(getClientIp(req));
  const userAgent = cleanValue(req.headers['user-agent'], 1024);

  let visitorId: string;
  const { data: existingVisitor } = await supabase
    .from('visitors')
    .select('id')
    .eq('anonymous_id', anonymousId)
    .maybeSingle();

  if (existingVisitor?.id) {
    visitorId = existingVisitor.id;
    await supabase
      .from('visitors')
      .update({
        last_seen_at: now,
        timezone: attribution.timezone,
        language: attribution.language,
        user_agent: userAgent,
        ip_hash: ipHash,
        updated_at: now,
      })
      .eq('id', visitorId);
  } else {
    const { data: createdVisitor, error } = await supabase
      .from('visitors')
      .insert({
        anonymous_id: anonymousId,
        first_seen_at: now,
        last_seen_at: now,
        timezone: attribution.timezone,
        language: attribution.language,
        user_agent: userAgent,
        ip_hash: ipHash,
        metadata: {},
      })
      .select('id')
      .single();

    if (error || !createdVisitor?.id) {
      throw error ?? new Error('Failed to create visitor');
    }

    visitorId = createdVisitor.id;
  }

  let sessionId: string;
  const { data: existingSession } = await supabase
    .from('sessions')
    .select('id, lead_id')
    .eq('session_key', sessionKey)
    .maybeSingle();

  if (existingSession?.id) {
    sessionId = existingSession.id;
    await supabase
      .from('sessions')
      .update({
        visitor_id: visitorId,
        last_seen_at: now,
        current_path: attribution.page_path,
        page_title: attribution.page_title,
        referrer: attribution.referrer,
        timezone: attribution.timezone,
        language: attribution.language,
        utm_source: attribution.utm_source,
        utm_medium: attribution.utm_medium,
        utm_campaign: attribution.utm_campaign,
        utm_term: attribution.utm_term,
        utm_content: attribution.utm_content,
        ip_hash: ipHash,
        updated_at: now,
      })
      .eq('id', sessionId);
  } else {
    const { data: createdSession, error } = await supabase
      .from('sessions')
      .insert({
        session_key: sessionKey,
        visitor_id: visitorId,
        lead_id: context.leadId || null,
        started_at: now,
        last_seen_at: now,
        landing_path: attribution.page_path,
        current_path: attribution.page_path,
        page_title: attribution.page_title,
        referrer: attribution.referrer,
        timezone: attribution.timezone,
        language: attribution.language,
        utm_source: attribution.utm_source,
        utm_medium: attribution.utm_medium,
        utm_campaign: attribution.utm_campaign,
        utm_term: attribution.utm_term,
        utm_content: attribution.utm_content,
        ip_hash: ipHash,
        metadata: {},
      })
      .select('id')
      .single();

    if (error || !createdSession?.id) {
      throw error ?? new Error('Failed to create session');
    }

    sessionId = createdSession.id;
  }

  return {
    supabase,
    visitorDbId: visitorId,
    sessionDbId: sessionId,
    anonymousId,
    sessionKey,
  };
}

export async function upsertLead(input: {
  email: string;
  name?: string;
  company?: string;
  phone?: string;
  source?: string;
  metadata?: JsonObject;
}) {
  const supabase = getSupabaseAdmin();
  const now = new Date().toISOString();
  const emailNormalized = normalizeEmail(input.email);
  const { data: existingLead } = await supabase
    .from('leads')
    .select('id')
    .eq('email_normalized', emailNormalized)
    .maybeSingle();

  if (existingLead?.id) {
    await supabase
      .from('leads')
      .update({
        name: cleanValue(input.name, 256),
        company: cleanValue(input.company, 256),
        phone: cleanValue(input.phone, 64),
        last_contact_at: now,
        source: cleanValue(input.source, 128),
        metadata: input.metadata ?? {},
        updated_at: now,
      })
      .eq('id', existingLead.id);

    return existingLead.id;
  }

  const { data: createdLead, error } = await supabase
    .from('leads')
    .insert({
      email: input.email.trim(),
      email_normalized: emailNormalized,
      name: cleanValue(input.name, 256),
      company: cleanValue(input.company, 256),
      phone: cleanValue(input.phone, 64),
      source: cleanValue(input.source, 128),
      status: 'new',
      first_contact_at: now,
      last_contact_at: now,
      metadata: input.metadata ?? {},
    })
    .select('id')
    .single();

  if (error || !createdLead?.id) {
    throw error ?? new Error('Failed to create lead');
  }

  return createdLead.id;
}

export async function attachLeadToSession(leadId: string, sessionId: string) {
  const supabase = getSupabaseAdmin();
  const now = new Date().toISOString();

  await supabase
    .from('sessions')
    .update({ lead_id: leadId, updated_at: now })
    .eq('id', sessionId);

  const { data: existingLink } = await supabase
    .from('lead_sessions')
    .select('id')
    .eq('lead_id', leadId)
    .eq('session_id', sessionId)
    .maybeSingle();

  if (!existingLink?.id) {
    await supabase.from('lead_sessions').insert({
      lead_id: leadId,
      session_id: sessionId,
      linked_at: now,
    });
  }
}

export async function recordEvent(input: {
  eventName: string;
  context?: TrackingContextInput;
  properties?: JsonObject;
  req: VercelRequest;
  leadId?: string | null;
  voiceSessionId?: string | null;
  occurredAt?: string;
}) {
  const hasTrackingContext =
    !!input.context?.visitorId || !!input.context?.sessionId;
  let supabase = getSupabaseAdmin();
  let visitorDbId: string | null = null;
  let sessionDbId: string | null = null;
  let leadId = input.leadId ?? input.context?.leadId ?? null;
  let voiceSessionDbId: string | null = null;

  if (input.voiceSessionId && !hasTrackingContext) {
    const voiceSession = await getVoiceSessionByPublicId(input.voiceSessionId);
    visitorDbId = voiceSession.visitor_id as string;
    sessionDbId = voiceSession.session_id as string;
    leadId = (voiceSession.lead_id as string | null) ?? leadId;
    voiceSessionDbId = voiceSession.id as string;
  } else {
    const ensured = await ensureTrackingEntities(input.req, input.context);
    supabase = ensured.supabase;
    visitorDbId = ensured.visitorDbId;
    sessionDbId = ensured.sessionDbId;
    if (input.voiceSessionId) {
      const voiceSession = await getVoiceSessionByPublicId(
        input.voiceSessionId,
      );
      voiceSessionDbId = voiceSession.id as string;
      leadId = (voiceSession.lead_id as string | null) ?? leadId;
    }
  }

  await supabase.from('events').insert({
    visitor_id: visitorDbId,
    session_id: sessionDbId,
    lead_id: leadId,
    voice_session_id: voiceSessionDbId,
    event_name: sanitizeEventName(input.eventName),
    page_path: cleanValue(input.context?.pagePath, 2048),
    occurred_at: input.occurredAt ?? new Date().toISOString(),
    properties: input.properties ?? {},
  });

  return {
    visitorDbId,
    sessionDbId,
  };
}

export async function createVoiceSession(input: {
  req: VercelRequest;
  context: TrackingContextInput;
  consent: VoiceConsentPayload;
  metadata?: JsonObject;
}) {
  const { supabase, visitorDbId, sessionDbId } = await ensureTrackingEntities(
    input.req,
    input.context,
  );
  const publicId = `vs_${randomUUID().replace(/-/g, '')}`;
  const now = new Date().toISOString();

  const { data, error } = await supabase
    .from('voice_sessions')
    .insert({
      public_id: publicId,
      visitor_id: visitorDbId,
      session_id: sessionDbId,
      lead_id: input.context?.leadId ?? null,
      provider: 'gemini',
      model: 'gemini-live',
      status: 'created',
      started_at: now,
      consent_accepted: input.consent.accepted,
      consent_accepted_at: input.consent.acceptedAt,
      consent_version: input.consent.version,
      transcript_enabled: true,
      audio_enabled: true,
      metadata: input.metadata ?? {},
    })
    .select('id, public_id')
    .single();

  if (error || !data?.public_id) {
    throw error ?? new Error('Failed to create voice session');
  }

  return {
    voiceSessionDbId: data.id as string,
    voiceSessionId: data.public_id as string,
    visitorDbId,
    sessionDbId,
  };
}

export async function getVoiceSessionByPublicId(publicId: string) {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from('voice_sessions')
    .select('id, public_id, visitor_id, session_id, lead_id')
    .eq('public_id', publicId)
    .single();

  if (error || !data?.id) {
    throw error ?? new Error('Voice session not found');
  }

  return data;
}

export async function updateVoiceSession(publicId: string, values: JsonObject) {
  const supabase = getSupabaseAdmin();
  const now = new Date().toISOString();
  await supabase
    .from('voice_sessions')
    .update({
      ...values,
      updated_at: now,
    })
    .eq('public_id', publicId);
}

export async function upsertTranscriptTurns(
  publicId: string,
  turns: TranscriptTurnPayload[],
) {
  if (!turns.length) {
    return;
  }

  const supabase = getSupabaseAdmin();
  const voiceSession = await getVoiceSessionByPublicId(publicId);
  const rows = turns.map((turn) => ({
    voice_session_id: voiceSession.id,
    turn_index: turn.turnIndex,
    speaker: turn.speaker,
    text: sanitizeText(turn.text, 12000),
    is_final: turn.isFinal,
    captured_at: turn.capturedAt,
    metadata: turn.metadata ?? {},
  }));

  await supabase
    .from('voice_transcript_turns')
    .upsert(rows, { onConflict: 'voice_session_id,turn_index' });
}

export async function recordVoiceToolCall(input: {
  voiceSessionId: string;
  callId: string;
  toolName: string;
  args?: JsonObject;
  result?: JsonObject;
  capturedAt: string;
}) {
  const supabase = getSupabaseAdmin();
  const voiceSession = await getVoiceSessionByPublicId(input.voiceSessionId);
  await supabase.from('voice_tool_calls').insert({
    voice_session_id: voiceSession.id,
    call_id: cleanValue(input.callId, 256),
    tool_name: cleanValue(input.toolName, 256),
    args: input.args ?? {},
    result: input.result ?? {},
    captured_at: input.capturedAt,
  });
}

export async function recordError(input: {
  req: VercelRequest;
  context?: TrackingContextInput;
  voiceSessionId?: string;
  scope: string;
  message: string;
  errorCode?: string;
  severity?: string;
  metadata?: JsonObject;
  occurredAt?: string;
}) {
  const hasTrackingContext =
    !!input.context?.visitorId || !!input.context?.sessionId;
  let supabase = getSupabaseAdmin();
  let visitorDbId: string | null = null;
  let sessionDbId: string | null = null;
  let leadId: string | null = input.context?.leadId ?? null;
  let voiceSessionDbId: string | null = null;

  if (input.voiceSessionId && !hasTrackingContext) {
    const voiceSession = await getVoiceSessionByPublicId(input.voiceSessionId);
    visitorDbId = voiceSession.visitor_id as string;
    sessionDbId = voiceSession.session_id as string;
    leadId = (voiceSession.lead_id as string | null) ?? leadId;
    voiceSessionDbId = voiceSession.id as string;
  } else {
    const ensured = await ensureTrackingEntities(input.req, input.context);
    supabase = ensured.supabase;
    visitorDbId = ensured.visitorDbId;
    sessionDbId = ensured.sessionDbId;
  }

  if (input.voiceSessionId && !voiceSessionDbId) {
    const voiceSession = await getVoiceSessionByPublicId(input.voiceSessionId);
    voiceSessionDbId = voiceSession.id as string;
    leadId = (voiceSession.lead_id as string | null) ?? leadId;
    await supabase
      .from('voice_sessions')
      .update({
        error_count:
          (input.metadata?.errorCount as number | undefined) ?? undefined,
        last_error: sanitizeText(input.message, 2000),
        updated_at: new Date().toISOString(),
      })
      .eq('id', voiceSessionDbId);
  }

  await supabase.from('errors').insert({
    visitor_id: visitorDbId,
    session_id: sessionDbId,
    lead_id: leadId,
    voice_session_id: voiceSessionDbId,
    scope: cleanValue(input.scope, 128),
    error_code: cleanValue(input.errorCode, 128),
    message: sanitizeText(input.message, 4000),
    severity: cleanValue(input.severity, 32) || 'error',
    metadata: input.metadata ?? {},
    occurred_at: input.occurredAt ?? new Date().toISOString(),
  });
}
