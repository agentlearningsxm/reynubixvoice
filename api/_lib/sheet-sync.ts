/**
 * Orchestrator: pulls voice session data from Supabase,
 * summarises with Gemini, writes a row to Google Sheets.
 *
 * Called fire-and-forget from the session-end endpoint.
 */
import { getSupabaseAdmin } from './supabaseAdmin.js';
import { appendSheetRow, ensureSheetHeaders } from './google-sheets.js';
import { analyzeTranscript } from './gemini-summary.js';

type Json = Record<string, unknown>;

function formatAmsterdamDate(iso: string) {
  const d = new Date(iso);
  const date = d.toLocaleDateString('en-GB', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    timeZone: 'Europe/Amsterdam',
  });
  const time = d.toLocaleTimeString('en-GB', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    timeZone: 'Europe/Amsterdam',
  });
  return { date, time };
}

export async function syncSessionToSheet(voiceSessionPublicId: string) {
  const supabase = getSupabaseAdmin();

  // ── 1. Voice session ──────────────────────────────────────────
  const { data: session, error: sessionErr } = await supabase
    .from('voice_sessions')
    .select('*')
    .eq('public_id', voiceSessionPublicId)
    .single();

  if (sessionErr || !session) {
    throw new Error(`Voice session not found: ${voiceSessionPublicId}`);
  }

  // ── 2. Transcript turns ───────────────────────────────────────
  const { data: turns } = await supabase
    .from('voice_transcript_turns')
    .select('speaker, text, turn_index')
    .eq('voice_session_id', session.id)
    .order('turn_index', { ascending: true });

  // ── 3. Tool calls ────────────────────────────────────────────
  const { data: toolCalls } = await supabase
    .from('voice_tool_calls')
    .select('tool_name, args')
    .eq('voice_session_id', session.id);

  // ── 4. Errors ────────────────────────────────────────────────
  const { data: errors } = await supabase
    .from('errors')
    .select('scope, message, severity, occurred_at')
    .eq('voice_session_id', session.id)
    .order('occurred_at', { ascending: true });

  // ── 5. Audio assets (first recording, if any) ────────────────
  const { data: audioAssets } = await supabase
    .from('voice_audio_assets')
    .select('storage_path')
    .eq('voice_session_id', session.id)
    .limit(1);

  // ── 6. Visitor language ──────────────────────────────────────
  let language = 'unknown';
  if (session.visitor_id) {
    const { data: visitor } = await supabase
      .from('visitors')
      .select('language')
      .eq('id', session.visitor_id)
      .single();
    language = visitor?.language || 'unknown';
  }

  // ── Build full transcript text ───────────────────────────────
  const transcriptText = (turns || [])
    .map((t) => `${t.speaker === 'ai' ? 'Reyna' : 'Guest'}: ${t.text}`)
    .join('\n');

  // ── Gemini analysis ──────────────────────────────────────────
  const analysis = await analyzeTranscript(
    transcriptText || (session.summary as string) || '',
  );

  // ── Extract tool call info ───────────────────────────────────
  const calculatorCall = (toolCalls || []).find(
    (tc) => tc.tool_name === 'update_calculator',
  );
  const bookingCall = (toolCalls || []).find(
    (tc) => tc.tool_name === 'open_cal_popup',
  );
  const calcArgs = (calculatorCall?.args ?? {}) as Json;

  // ── Format errors ────────────────────────────────────────────
  const errorLog =
    (errors || [])
      .map((e) => `[${e.severity}] ${e.scope}: ${e.message}`)
      .join(' | ')
      .slice(0, 2000) || 'None';

  // ── Date / time ──────────────────────────────────────────────
  const { date, time } = formatAmsterdamDate(
    (session.started_at as string) || new Date().toISOString(),
  );

  // ── Duration ─────────────────────────────────────────────────
  const durationSec = session.duration_ms
    ? Math.round((session.duration_ms as number) / 1000)
    : 0;

  // ── Recording URL (signed — bucket is private) ──────────────
  const storagePath = audioAssets?.[0]?.storage_path;
  let recordingUrl = 'N/A';
  if (storagePath) {
    const { data: signedData } = await supabase.storage
      .from('voice-session-audio')
      .createSignedUrl(storagePath, 60 * 60 * 24 * 365); // 1 year expiry
    recordingUrl = signedData?.signedUrl || 'N/A';
  }

  // ── Ensure headers exist on first run ────────────────────────
  await ensureSheetHeaders();

  // ── Append the row ───────────────────────────────────────────
  await appendSheetRow([
    date,
    time,
    durationSec,
    language,
    (transcriptText || (session.summary as string) || 'No transcript').slice(
      0,
      50000,
    ),
    analysis.summary,
    analysis.sentiment,
    calculatorCall ? 'Yes' : 'No',
    (calcArgs.revenue as string | number) ?? 'N/A',
    (calcArgs.missedCalls as string | number) ?? 'N/A',
    bookingCall ? 'Yes' : 'No',
    errorLog,
    recordingUrl,
    voiceSessionPublicId,
    analysis.callQualityScore ?? 'N/A',
    analysis.errorsDetected ?? 'N/A',
    analysis.promptFixRecommendations ?? 'N/A',
    analysis.failureSource ?? 'N/A',
    analysis.callOutcome ?? 'N/A',
  ]);

  console.log(
    `[sheet-sync] Row appended for session ${voiceSessionPublicId}`,
  );
}
