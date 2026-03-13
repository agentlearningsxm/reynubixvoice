create or replace view public.reporting_daily_funnel
with (security_invoker = true) as
with daily_counts as (
  select
    created_at::date as day,
    count(*)::bigint as visitors,
    0::bigint as sessions,
    0::bigint as leads,
    0::bigint as contact_submissions,
    0::bigint as voice_sessions_started,
    0::bigint as voice_sessions_completed,
    0::bigint as voice_sessions_failed,
    0::bigint as transcript_turns,
    0::bigint as audio_uploads,
    0::bigint as bookings,
    0::bigint as errors
  from public.visitors
  group by 1

  union all

  select
    created_at::date as day,
    0::bigint,
    count(*)::bigint,
    0::bigint,
    0::bigint,
    0::bigint,
    0::bigint,
    0::bigint,
    0::bigint,
    0::bigint,
    0::bigint,
    0::bigint
  from public.sessions
  group by 1

  union all

  select
    created_at::date as day,
    0::bigint,
    0::bigint,
    count(*)::bigint,
    0::bigint,
    0::bigint,
    0::bigint,
    0::bigint,
    0::bigint,
    0::bigint,
    0::bigint,
    0::bigint
  from public.leads
  group by 1

  union all

  select
    submitted_at::date as day,
    0::bigint,
    0::bigint,
    0::bigint,
    count(*)::bigint,
    0::bigint,
    0::bigint,
    0::bigint,
    0::bigint,
    0::bigint,
    0::bigint,
    0::bigint
  from public.contact_submissions
  group by 1

  union all

  select
    started_at::date as day,
    0::bigint,
    0::bigint,
    0::bigint,
    0::bigint,
    count(*)::bigint,
    count(*) filter (where status = 'completed')::bigint,
    count(*) filter (where status = 'failed')::bigint,
    0::bigint,
    0::bigint,
    0::bigint,
    0::bigint
  from public.voice_sessions
  group by 1

  union all

  select
    captured_at::date as day,
    0::bigint,
    0::bigint,
    0::bigint,
    0::bigint,
    0::bigint,
    0::bigint,
    0::bigint,
    count(*)::bigint,
    0::bigint,
    0::bigint,
    0::bigint
  from public.voice_transcript_turns
  group by 1

  union all

  select
    created_at::date as day,
    0::bigint,
    0::bigint,
    0::bigint,
    0::bigint,
    0::bigint,
    0::bigint,
    0::bigint,
    0::bigint,
    count(*)::bigint,
    0::bigint,
    0::bigint
  from public.voice_audio_assets
  group by 1

  union all

  select
    created_at::date as day,
    0::bigint,
    0::bigint,
    0::bigint,
    0::bigint,
    0::bigint,
    0::bigint,
    0::bigint,
    0::bigint,
    0::bigint,
    count(*)::bigint,
    0::bigint
  from public.bookings
  group by 1

  union all

  select
    occurred_at::date as day,
    0::bigint,
    0::bigint,
    0::bigint,
    0::bigint,
    0::bigint,
    0::bigint,
    0::bigint,
    0::bigint,
    0::bigint,
    0::bigint,
    count(*)::bigint
  from public.errors
  group by 1
)
select
  day,
  sum(visitors) as visitors,
  sum(sessions) as sessions,
  sum(leads) as leads,
  sum(contact_submissions) as contact_submissions,
  sum(voice_sessions_started) as voice_sessions_started,
  sum(voice_sessions_completed) as voice_sessions_completed,
  sum(voice_sessions_failed) as voice_sessions_failed,
  sum(transcript_turns) as transcript_turns,
  sum(audio_uploads) as audio_uploads,
  sum(bookings) as bookings,
  sum(errors) as errors
from daily_counts
group by day
order by day desc;

create or replace view public.reporting_recent_leads
with (security_invoker = true) as
select
  l.id as lead_id,
  l.created_at as lead_created_at,
  coalesce(l.last_contact_at, l.created_at) as last_touch_at,
  l.first_contact_at,
  l.last_contact_at,
  l.status as lead_status,
  l.source,
  l.name,
  l.company,
  l.email,
  l.phone,
  coalesce(ls.session_count, 0)::bigint as session_count,
  coalesce(cs.contact_submission_count, 0)::bigint as contact_submission_count,
  cs.last_submission_at,
  left(coalesce(cs.last_message, ''), 280) as last_message_preview,
  coalesce(vs.voice_session_count, 0)::bigint as voice_session_count,
  vs.last_voice_session_at,
  coalesce(b.booking_count, 0)::bigint as booking_count,
  b.last_booking_at,
  l.metadata
from public.leads l
left join lateral (
  select count(*) as session_count
  from public.lead_sessions ls
  where ls.lead_id = l.id
) ls on true
left join lateral (
  select
    count(*) as contact_submission_count,
    max(submitted_at) as last_submission_at,
    (
      array_agg(message order by submitted_at desc nulls last)
    )[1] as last_message
  from public.contact_submissions cs
  where cs.lead_id = l.id
) cs on true
left join lateral (
  select
    count(*) as voice_session_count,
    max(started_at) as last_voice_session_at
  from public.voice_sessions vs
  where vs.lead_id = l.id
) vs on true
left join lateral (
  select
    count(*) as booking_count,
    max(created_at) as last_booking_at
  from public.bookings b
  where b.lead_id = l.id
) b on true
order by last_touch_at desc nulls last, lead_created_at desc;

create or replace view public.reporting_recent_voice_sessions
with (security_invoker = true) as
select
  vs.public_id as voice_session_id,
  vs.started_at,
  vs.connected_at,
  vs.ended_at,
  vs.status,
  vs.provider,
  vs.model,
  vs.duration_ms,
  vs.audio_status,
  vs.error_count,
  vs.last_error,
  vs.consent_version,
  l.id as lead_id,
  l.name as lead_name,
  l.company as lead_company,
  l.email as lead_email,
  s.session_key,
  s.landing_path,
  s.current_path
from public.voice_sessions vs
left join public.leads l on l.id = vs.lead_id
left join public.sessions s on s.id = vs.session_id
order by vs.started_at desc;

grant select on public.reporting_daily_funnel to authenticated, service_role;
grant select on public.reporting_recent_leads to authenticated, service_role;
grant select on public.reporting_recent_voice_sessions to authenticated, service_role;
