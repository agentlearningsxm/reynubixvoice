-- Call Analytics Migration: Replace Google Sheets with Supabase
-- Stores all 20 columns from the "reyna web" sheet as structured data
-- Links to voice_sessions for full traceability

-- ─────────────────────────────────────────────
-- A. CALL ANALYTICS TABLE
-- ─────────────────────────────────────────────

create table if not exists public.call_analytics (
  id uuid primary key default gen_random_uuid(),
  voice_session_id uuid not null references public.voice_sessions(id) on delete cascade,

  -- Temporal
  call_date date not null,
  call_time time not null,
  duration_sec integer not null default 0,

  -- Session metadata
  language text not null default 'unknown',
  session_id text not null,  -- public_id from voice_sessions

  -- Transcript & AI Analysis
  full_transcript text,
  ai_summary text,
  sentiment text check (sentiment in ('positive', 'neutral', 'negative', 'frustrated')),

  -- Tool Usage
  calculator_used boolean not null default false,
  revenue_entered text,
  missed_calls text,
  booking_requested boolean not null default false,

  -- Error & Quality
  error_log text,
  call_quality_score integer check (call_quality_score between 0 and 10),
  errors_detected text,
  prompt_fix_recommendations text,
  failure_source text check (failure_source in ('greeting', 'qualification', 'calculator', 'booking', 'transfer', 'closing', 'none')),
  call_outcome text check (call_outcome in ('qualified-lead', 'information-only', 'dropped', 'error', 'booking-made')),

  -- Recording
  recording_url text,

  -- Metadata
  raw_groq_response jsonb,
  analysis_model text,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ─────────────────────────────────────────────
-- B. INDEXES
-- ─────────────────────────────────────────────

create index idx_call_analytics_session_id on public.call_analytics(voice_session_id);
create index idx_call_analytics_call_date on public.call_analytics(call_date desc);
create index idx_call_analytics_sentiment on public.call_analytics(sentiment);
create index idx_call_analytics_call_outcome on public.call_analytics(call_outcome);
create index idx_call_analytics_quality_score on public.call_analytics(call_quality_score);
create index idx_call_analytics_failure_source on public.call_analytics(failure_source);
create index idx_call_analytics_session_public_id on public.call_analytics(session_id);

-- Composite indexes for common filter combinations
create index idx_call_analytics_date_sentiment on public.call_analytics(call_date desc, sentiment);
create index idx_call_analytics_date_outcome on public.call_analytics(call_date desc, call_outcome);

-- ─────────────────────────────────────────────
-- C. ROW LEVEL SECURITY
-- ─────────────────────────────────────────────

alter table public.call_analytics enable row level security;

create policy "Authenticated users can read call analytics"
  on public.call_analytics for select
  using (
    auth.role() = 'authenticated'
    and exists (select 1 from public.profiles where id = auth.uid())
  );

create policy "System can write call analytics"
  on public.call_analytics for all
  using (true)
  with check (true);

-- ─────────────────────────────────────────────
-- D. TRIGGER — auto-update timestamps
-- ─────────────────────────────────────────────

create trigger set_call_analytics_updated_at
  before update on public.call_analytics
  for each row execute function public.set_updated_at();

-- ─────────────────────────────────────────────
-- E. VIEW — call analytics with lead info
-- ─────────────────────────────────────────────

create or replace view reporting_call_analytics_detail as
select
  ca.*,
  l.name as lead_name,
  l.email as lead_email,
  l.company as lead_company,
  l.phone as lead_phone,
  vs.status as session_status,
  vs.started_at as session_started_at
from public.call_analytics ca
left join public.voice_sessions vs on vs.id = ca.voice_session_id
left join public.leads l on l.id = vs.lead_id;

grant select on reporting_call_analytics_detail to authenticated, service_role;
