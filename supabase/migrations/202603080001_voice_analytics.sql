create extension if not exists pgcrypto;

create table if not exists public.visitors (
  id uuid primary key default gen_random_uuid(),
  anonymous_id text not null unique,
  first_seen_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now(),
  timezone text,
  language text,
  user_agent text,
  ip_hash text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.leads (
  id uuid primary key default gen_random_uuid(),
  email text not null,
  email_normalized text not null unique,
  name text,
  company text,
  phone text,
  source text,
  status text not null default 'new',
  first_contact_at timestamptz,
  last_contact_at timestamptz,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.sessions (
  id uuid primary key default gen_random_uuid(),
  session_key text not null unique,
  visitor_id uuid not null references public.visitors(id) on delete cascade,
  lead_id uuid references public.leads(id) on delete set null,
  started_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now(),
  ended_at timestamptz,
  landing_path text,
  current_path text,
  page_title text,
  referrer text,
  timezone text,
  language text,
  utm_source text,
  utm_medium text,
  utm_campaign text,
  utm_term text,
  utm_content text,
  ip_hash text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.lead_sessions (
  id uuid primary key default gen_random_uuid(),
  lead_id uuid not null references public.leads(id) on delete cascade,
  session_id uuid not null references public.sessions(id) on delete cascade,
  linked_at timestamptz not null default now(),
  unique (lead_id, session_id)
);

create table if not exists public.voice_sessions (
  id uuid primary key default gen_random_uuid(),
  public_id text not null unique,
  visitor_id uuid not null references public.visitors(id) on delete cascade,
  session_id uuid not null references public.sessions(id) on delete cascade,
  lead_id uuid references public.leads(id) on delete set null,
  provider text not null default 'gemini',
  model text,
  status text not null default 'created',
  started_at timestamptz not null default now(),
  connected_at timestamptz,
  ended_at timestamptz,
  duration_ms bigint,
  consent_accepted boolean not null default false,
  consent_accepted_at timestamptz,
  consent_version text,
  transcript_enabled boolean not null default true,
  audio_enabled boolean not null default true,
  audio_status text,
  error_count integer not null default 0,
  summary text,
  last_error text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.events (
  id uuid primary key default gen_random_uuid(),
  visitor_id uuid references public.visitors(id) on delete set null,
  session_id uuid references public.sessions(id) on delete set null,
  lead_id uuid references public.leads(id) on delete set null,
  voice_session_id uuid references public.voice_sessions(id) on delete set null,
  event_name text not null,
  page_path text,
  occurred_at timestamptz not null default now(),
  properties jsonb not null default '{}'::jsonb
);

create table if not exists public.contact_submissions (
  id uuid primary key default gen_random_uuid(),
  lead_id uuid references public.leads(id) on delete set null,
  session_id uuid references public.sessions(id) on delete set null,
  status text not null default 'received',
  delivery_status text not null default 'pending',
  name text not null,
  email text not null,
  company text,
  message text not null,
  metadata jsonb not null default '{}'::jsonb,
  submitted_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create table if not exists public.voice_transcript_turns (
  id uuid primary key default gen_random_uuid(),
  voice_session_id uuid not null references public.voice_sessions(id) on delete cascade,
  turn_index integer not null,
  speaker text not null,
  text text not null,
  is_final boolean not null default false,
  captured_at timestamptz not null default now(),
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  unique (voice_session_id, turn_index)
);

create table if not exists public.voice_audio_assets (
  id uuid primary key default gen_random_uuid(),
  voice_session_id uuid not null references public.voice_sessions(id) on delete cascade,
  asset_type text not null,
  storage_bucket text not null,
  storage_path text not null,
  mime_type text not null,
  byte_size bigint not null,
  duration_ms bigint,
  checksum text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.voice_tool_calls (
  id uuid primary key default gen_random_uuid(),
  voice_session_id uuid not null references public.voice_sessions(id) on delete cascade,
  call_id text,
  tool_name text not null,
  args jsonb not null default '{}'::jsonb,
  result jsonb not null default '{}'::jsonb,
  captured_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create table if not exists public.errors (
  id uuid primary key default gen_random_uuid(),
  visitor_id uuid references public.visitors(id) on delete set null,
  session_id uuid references public.sessions(id) on delete set null,
  lead_id uuid references public.leads(id) on delete set null,
  voice_session_id uuid references public.voice_sessions(id) on delete set null,
  scope text not null,
  error_code text,
  message text not null,
  severity text not null default 'error',
  metadata jsonb not null default '{}'::jsonb,
  occurred_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create table if not exists public.bookings (
  id uuid primary key default gen_random_uuid(),
  lead_id uuid references public.leads(id) on delete set null,
  session_id uuid references public.sessions(id) on delete set null,
  provider text not null default 'cal',
  provider_booking_id text,
  status text not null default 'clicked',
  event_type text,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_sessions_visitor_id on public.sessions(visitor_id);
create index if not exists idx_sessions_lead_id on public.sessions(lead_id);
create index if not exists idx_events_session_id on public.events(session_id);
create index if not exists idx_events_voice_session_id on public.events(voice_session_id);
create index if not exists idx_events_event_name on public.events(event_name);
create index if not exists idx_voice_sessions_session_id on public.voice_sessions(session_id);
create index if not exists idx_voice_transcript_turns_session_id on public.voice_transcript_turns(voice_session_id);
create index if not exists idx_voice_audio_assets_session_id on public.voice_audio_assets(voice_session_id);
create index if not exists idx_errors_voice_session_id on public.errors(voice_session_id);
create index if not exists idx_contact_submissions_session_id on public.contact_submissions(session_id);

alter table public.visitors enable row level security;
alter table public.leads enable row level security;
alter table public.sessions enable row level security;
alter table public.lead_sessions enable row level security;
alter table public.voice_sessions enable row level security;
alter table public.events enable row level security;
alter table public.contact_submissions enable row level security;
alter table public.voice_transcript_turns enable row level security;
alter table public.voice_audio_assets enable row level security;
alter table public.voice_tool_calls enable row level security;
alter table public.errors enable row level security;
alter table public.bookings enable row level security;

insert into storage.buckets (id, name, public, file_size_limit)
values ('voice-session-audio', 'voice-session-audio', false, 52428800)
on conflict (id) do nothing;
