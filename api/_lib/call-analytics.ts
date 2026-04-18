/**
 * Call Analytics: pulls voice session data from Supabase,
 * analyzes with Groq, writes to call_analytics table.
 *
 * Called fire-and-forget from the session-end endpoint.
 * Replaces Google Sheets sync (api/_lib/google-sheets.ts deleted).
 */
import { analyzeSessionData } from './groq-summary.js';
import { getSupabaseAdmin } from './supabaseAdmin.js';

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

export async function analyzeAndStoreSession(voiceSessionPublicId: string) {
  const supabase = getSupabaseAdmin();

  // 1. Voice session
  const { data: session, error: sessionErr } = await supabase
    .from('voice_sessions')
    .select('*')
    .eq('public_id', voiceSessionPublicId)
    .single();

  if (sessionErr || !session) {
    throw new Error(`Voice session not found: ${voiceSessionPublicId}`);
  }

  // Check if already analyzed (idempotent)
  const { data: existing } = await supabase
    .from('call_analytics')
    .select('id')
    .eq('session_id', voiceSessionPublicId)
    .maybeSingle();

  if (existing) {
    console.log(`[call-analytics] Already analyzed: ${voiceSessionPublicId}`);
    return;
  }

  // 2. Transcript turns
  const { data: turns } = await supabase
    .from('voice_transcript_turns')
    .select('speaker, text, turn_index')
    .eq('voice_session_id', session.id)
    .order('turn_index', { ascending: true });

  // 3. Tool calls
  const { data: toolCalls } = await supabase
    .from('voice_tool_calls')
    .select('tool_name, args')
    .eq('voice_session_id', session.id);

  // 4. Errors
  const { data: errors } = await supabase
    .from('errors')
    .select('scope, message, severity, occurred_at')
    .eq('voice_session_id', session.id)
    .order('occurred_at', { ascending: true });

  // 5. Audio assets (with retry)
  let audioAssets: { storage_path: string }[] | null = null;
  for (let attempt = 0; attempt < 2; attempt++) {
    const { data } = await supabase
      .from('voice_audio_assets')
      .select('storage_path')
      .eq('voice_session_id', session.id)
      .limit(1);
    audioAssets = data;
    if (audioAssets && audioAssets.length > 0) break;
    if (attempt === 0) {
      await new Promise((r) => setTimeout(r, 3000));
    }
  }

  // 6. Visitor language
  let language = 'unknown';
  if (session.visitor_id) {
    const { data: visitor } = await supabase
      .from('visitors')
      .select('language')
      .eq('id', session.visitor_id)
      .single();
    language = visitor?.language || 'unknown';
  }

  // Build transcript
  const transcriptText = (turns || [])
    .map(
      (t: { speaker: string; text: string }) =>
        `${t.speaker === 'ai' ? 'Reyna' : 'Guest'}: ${t.text}`,
    )
    .join('\n');

  // Extract tool call info
  const calculatorCall = (toolCalls || []).find(
    (tc: { tool_name: string }) => tc.tool_name === 'update_calculator',
  );
  const bookingCall = (toolCalls || []).find(
    (tc: { tool_name: string }) => tc.tool_name === 'open_cal_popup',
  );
  const calcArgs = (calculatorCall?.args ?? {}) as Json;

  // Format errors
  const errorLog =
    (errors || [])
      .map(
        (e: { severity: string; scope: string; message: string }) =>
          `[${e.severity}] ${e.scope}: ${e.message}`,
      )
      .join(' | ')
      .slice(0, 2000) || 'None';

  // Date/time
  const { date, time } = formatAmsterdamDate(
    session.started_at || new Date().toISOString(),
  );

  // Duration
  const durationSec = session.duration_ms
    ? Math.round((session.duration_ms as number) / 1000)
    : 0;

  // Groq analysis
  const analysis = await analyzeSessionData({
    transcript: transcriptText || (session.summary as string) || '',
    language,
    durationSec,
    calculatorUsed: !!calculatorCall,
    revenueEntered:
      (calcArgs.revenue as string | number | null | undefined) ?? null,
    missedCalls:
      (calcArgs.missedCalls as string | number | null | undefined) ?? null,
    bookingRequested: !!bookingCall,
    errorLog,
    sessionId: voiceSessionPublicId,
  });

  // Recording URL (signed)
  const storagePath = audioAssets?.[0]?.storage_path;
  let recordingUrl: string | null = null;
  if (storagePath) {
    const { data: signedData } = await supabase.storage
      .from('voice-session-audio')
      .createSignedUrl(storagePath, 60 * 60 * 24 * 365);
    recordingUrl = signedData?.signedUrl || null;
  }

  // Parse date/time for storage
  const [day, month, year] = date.split('/').map(Number);
  const [hour, minute, second] = time.split(':').map(Number);
  const callDate = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
  const callTime = `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}:${String(second).padStart(2, '0')}`;

  // Write to Supabase
  const { error: insertError } = await supabase.from('call_analytics').insert({
    voice_session_id: session.id,
    call_date: callDate,
    call_time: callTime,
    duration_sec: durationSec,
    language,
    session_id: voiceSessionPublicId,
    full_transcript: (
      transcriptText ||
      (session.summary as string) ||
      'No transcript'
    ).slice(0, 50000),
    ai_summary: analysis.summary,
    sentiment: analysis.sentiment,
    calculator_used: !!calculatorCall,
    revenue_entered: (calcArgs.revenue as string | number) ?? null,
    missed_calls: (calcArgs.missedCalls as string | number) ?? null,
    booking_requested: !!bookingCall,
    error_log: errorLog,
    recording_url: recordingUrl,
    call_quality_score: analysis.callQualityScore,
    errors_detected: analysis.errorsDetected,
    prompt_fix_recommendations: analysis.promptFixRecommendations,
    failure_source: analysis.failureSource,
    call_outcome: analysis.callOutcome,
  });

  if (insertError) {
    throw new Error(`[call-analytics] Insert failed: ${insertError.message}`);
  }

  console.log(
    `[call-analytics] Stored analysis for session ${voiceSessionPublicId}`,
  );

  // ─── CRM: auto-create lead + interaction from voice session ───
  try {
    const leadEmail = analysis.callerEmail
      ? analysis.callerEmail.toLowerCase().trim()
      : null;

    // Skip lead creation if we have zero contact info
    if (!leadEmail && !analysis.callerName && !analysis.callerPhone) {
      console.log(
        `[call-analytics] No contact info for ${voiceSessionPublicId}, skipping lead creation`,
      );
      return;
    }

    let leadRow: { id: string } | null = null;
    let leadErr: { message: string } | null = null;

    if (leadEmail) {
      // Known caller — upsert by email
      const result = await supabase
        .from('leads')
        .upsert(
          {
            email: leadEmail,
            email_normalized: leadEmail,
            name: analysis.callerName || null,
            company: analysis.callerCompany || null,
            phone: analysis.callerPhone || null,
            source: 'voice_session',
            status:
              analysis.callOutcome === 'qualified-lead' ? 'qualified' : 'new',
            first_contact_at: session.started_at || new Date().toISOString(),
            last_contact_at: session.ended_at || new Date().toISOString(),
            metadata: {
              business_type: analysis.businessType || null,
              last_voice_session: voiceSessionPublicId,
              sentiment: analysis.sentiment,
            },
          },
          { onConflict: 'email_normalized' },
        )
        .select('id')
        .single();
      leadRow = result.data;
      leadErr = result.error;
    } else {
      // Anonymous caller — has name or phone but no email
      const result = await supabase
        .from('leads')
        .insert({
          email: null,
          email_normalized: null,
          name: analysis.callerName || null,
          company: analysis.callerCompany || null,
          phone: analysis.callerPhone || null,
          source: 'voice_session',
          status:
            analysis.callOutcome === 'qualified-lead' ? 'qualified' : 'new',
          first_contact_at: session.started_at || new Date().toISOString(),
          last_contact_at: session.ended_at || new Date().toISOString(),
          metadata: {
            anonymous: true,
            business_type: analysis.businessType || null,
            last_voice_session: voiceSessionPublicId,
            sentiment: analysis.sentiment,
          },
        })
        .select('id')
        .single();
      leadRow = result.data;
      leadErr = result.error;
    }

    if (leadErr || !leadRow) {
      console.error('[call-analytics] Lead upsert failed:', leadErr?.message);
    } else {
      const leadId = leadRow.id;

      // Link voice session to lead
      await supabase
        .from('voice_sessions')
        .update({ lead_id: leadId })
        .eq('id', session.id);

      // Create interaction record
      const interactionTitle = (analysis.summary || 'Voice session').slice(
        0,
        200,
      );
      await supabase.from('interactions').insert({
        lead_id: leadId,
        type: 'voice_session',
        title: interactionTitle,
        body: analysis.summary,
        direction: 'inbound',
        status: 'completed',
        completed_at: session.ended_at || new Date().toISOString(),
        duration_seconds: durationSec,
        metadata: {
          session_id: voiceSessionPublicId,
          sentiment: analysis.sentiment,
          call_quality_score: analysis.callQualityScore,
          call_outcome: analysis.callOutcome,
          recording_url: recordingUrl,
          calculator_used: !!calculatorCall,
          booking_requested: !!bookingCall,
        },
      });

      // Create follow-up task for qualified leads
      if (analysis.callOutcome === 'qualified-lead') {
        const callerLabel =
          analysis.callerName ||
          analysis.callerCompany ||
          leadEmail ||
          'Anonymous caller';
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        tomorrow.setHours(9, 0, 0, 0);

        await supabase.from('tasks').insert({
          lead_id: leadId,
          title: `Follow up with ${callerLabel}`,
          description:
            `Qualified lead from voice session. ${analysis.summary || ''}`.trim(),
          priority: 'high',
          status: 'pending',
          due_date: tomorrow.toISOString(),
        });
      }

      console.log(
        `[call-analytics] CRM lead ${leadId} created/updated for session ${voiceSessionPublicId}`,
      );
    }
  } catch (crmErr) {
    // CRM population is best-effort — never break the analytics pipeline
    console.error('[call-analytics] CRM population failed:', crmErr);
  }
}
