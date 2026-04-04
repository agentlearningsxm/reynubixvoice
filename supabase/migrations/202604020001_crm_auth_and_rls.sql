-- CRM Migration: Auth, Profiles, Deals, Interactions, Tasks, Notes, Audit Log
-- Run in Supabase SQL Editor or via supabase db push

-- ─────────────────────────────────────────────
-- A. EXTEND EXISTING TABLES
-- ─────────────────────────────────────────────

alter table public.leads
  add column if not exists assigned_to uuid references auth.users(id),
  add column if not exists lead_score integer default 0,
  add column if not exists pipeline_stage text default 'new',
  add column if not exists expected_value numeric(10,2),
  add column if not exists close_date date,
  add column if not exists last_activity_at timestamptz,
  add column if not exists tags text[] default '{}';

alter table public.bookings
  add column if not exists notes text,
  add column if not exists follow_up_required boolean default false,
  add column if not exists follow_up_date timestamptz;

-- ─────────────────────────────────────────────
-- B. NEW CRM TABLES
-- ─────────────────────────────────────────────

-- Admin profiles (extends auth.users)
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null unique,
  full_name text,
  role text not null default 'admin' check (role in ('admin', 'viewer')),
  avatar_url text,
  last_login_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Deals / opportunities
create table if not exists public.deals (
  id uuid primary key default gen_random_uuid(),
  lead_id uuid not null references public.leads(id) on delete cascade,
  title text not null,
  description text,
  stage text not null default 'qualification'
    check (stage in ('qualification', 'proposal', 'negotiation', 'won', 'lost')),
  value numeric(10,2),
  currency text default 'EUR',
  probability integer default 20 check (probability between 0 and 100),
  expected_close_date date,
  assigned_to uuid references auth.users(id),
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Interaction log (calls, emails, meetings, notes, voice sessions, bookings)
create table if not exists public.interactions (
  id uuid primary key default gen_random_uuid(),
  lead_id uuid not null references public.leads(id) on delete cascade,
  deal_id uuid references public.deals(id) on delete set null,
  type text not null check (type in ('call', 'email', 'meeting', 'note', 'voice_session', 'form_submission', 'booking')),
  title text not null,
  body text,
  direction text default 'outbound' check (direction in ('inbound', 'outbound', 'system')),
  status text default 'completed' check (status in ('scheduled', 'completed', 'cancelled', 'no_show')),
  scheduled_at timestamptz,
  completed_at timestamptz,
  duration_seconds integer,
  created_by uuid references auth.users(id),
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

-- Tasks / follow-ups
create table if not exists public.tasks (
  id uuid primary key default gen_random_uuid(),
  lead_id uuid references public.leads(id) on delete set null,
  deal_id uuid references public.deals(id) on delete set null,
  title text not null,
  description text,
  priority text default 'medium' check (priority in ('low', 'medium', 'high', 'urgent')),
  status text default 'pending' check (status in ('pending', 'in_progress', 'completed', 'cancelled')),
  due_date timestamptz,
  assigned_to uuid references auth.users(id),
  completed_by uuid references auth.users(id),
  completed_at timestamptz,
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Notes (free-form, attached to leads/deals)
create table if not exists public.notes (
  id uuid primary key default gen_random_uuid(),
  lead_id uuid references public.leads(id) on delete cascade,
  deal_id uuid references public.deals(id) on delete set null,
  body text not null,
  is_pinned boolean default false,
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- CRM activity audit log
create table if not exists public.crm_audit_log (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid references auth.users(id),
  action text not null,
  entity_type text not null,
  entity_id uuid not null,
  changes jsonb,
  ip_address text,
  created_at timestamptz not null default now()
);

-- ─────────────────────────────────────────────
-- C. INDEXES
-- ─────────────────────────────────────────────

create index if not exists idx_leads_assigned_to on public.leads(assigned_to);
create index if not exists idx_leads_pipeline_stage on public.leads(pipeline_stage);
create index if not exists idx_leads_status on public.leads(status);
create index if not exists idx_leads_email on public.leads(email);
create index if not exists idx_deals_lead_id on public.deals(lead_id);
create index if not exists idx_deals_stage on public.deals(stage);
create index if not exists idx_deals_assigned_to on public.deals(assigned_to);
create index if not exists idx_interactions_lead_id on public.interactions(lead_id);
create index if not exists idx_interactions_type on public.interactions(type);
create index if not exists idx_interactions_created_at on public.interactions(created_at desc);
create index if not exists idx_tasks_assigned_to on public.tasks(assigned_to);
create index if not exists idx_tasks_status on public.tasks(status);
create index if not exists idx_tasks_due_date on public.tasks(due_date);
create index if not exists idx_notes_lead_id on public.notes(lead_id);
create index if not exists idx_crm_audit_log_entity on public.crm_audit_log(entity_type, entity_id);

-- ─────────────────────────────────────────────
-- D. ROW LEVEL SECURITY POLICIES
-- ─────────────────────────────────────────────

-- Profiles: users can read their own, admins can read all
alter table public.profiles enable row level security;

create policy "Users can view own profile"
  on public.profiles for select
  using (auth.uid() = id);

create policy "Admins can view all profiles"
  on public.profiles for select
  using (exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'admin'
  ));

create policy "Users can update own profile"
  on public.profiles for update
  using (auth.uid() = id);

create policy "Users can insert own profile"
  on public.profiles for insert
  with check (auth.uid() = id);

-- CRM tables: only authenticated users with profile
create policy "Authenticated users can manage deals"
  on public.deals for all
  using (
    auth.role() = 'authenticated'
    and exists (select 1 from public.profiles where id = auth.uid())
  )
  with check (
    auth.role() = 'authenticated'
    and exists (select 1 from public.profiles where id = auth.uid())
  );

create policy "Authenticated users can manage interactions"
  on public.interactions for all
  using (
    auth.role() = 'authenticated'
    and exists (select 1 from public.profiles where id = auth.uid())
  )
  with check (
    auth.role() = 'authenticated'
    and exists (select 1 from public.profiles where id = auth.uid())
  );

create policy "Authenticated users can manage tasks"
  on public.tasks for all
  using (
    auth.role() = 'authenticated'
    and exists (select 1 from public.profiles where id = auth.uid())
  )
  with check (
    auth.role() = 'authenticated'
    and exists (select 1 from public.profiles where id = auth.uid())
  );

create policy "Authenticated users can manage notes"
  on public.notes for all
  using (
    auth.role() = 'authenticated'
    and exists (select 1 from public.profiles where id = auth.uid())
  )
  with check (
    auth.role() = 'authenticated'
    and exists (select 1 from public.profiles where id = auth.uid())
  );

create policy "Admins can read audit log"
  on public.crm_audit_log for select
  using (
    auth.role() = 'authenticated'
    and exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
  );

create policy "Admins can write audit log"
  on public.crm_audit_log for insert
  with check (
    auth.role() = 'authenticated'
    and exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
  );

-- ─────────────────────────────────────────────
-- E. TRIGGERS — auto-update timestamps
-- ─────────────────────────────────────────────

create or replace function public.set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger set_deals_updated_at
  before update on public.deals
  for each row execute function public.set_updated_at();

create trigger set_tasks_updated_at
  before update on public.tasks
  for each row execute function public.set_updated_at();

create trigger set_notes_updated_at
  before update on public.notes
  for each row execute function public.set_updated_at();

create trigger set_profiles_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

-- ─────────────────────────────────────────────
-- F. TRIGGER — auto-create interaction on lead events
-- ─────────────────────────────────────────────

-- Auto-log interactions when contact submissions happen
create or replace function public.log_contact_submission_interaction()
returns trigger as $$
begin
  insert into public.interactions (lead_id, type, title, body, direction, metadata)
  values (
    new.lead_id,
    'form_submission',
    'Contact form submitted',
    new.message,
    'inbound',
    jsonb_build_object('email', new.email, 'company', new.company, 'submission_id', new.id)
  );
  return new;
end;
$$ language plpgsql;

drop trigger if exists auto_log_contact_interaction on public.contact_submissions;
create trigger auto_log_contact_interaction
  after insert on public.contact_submissions
  for each row
  when (new.lead_id is not null)
  execute function public.log_contact_submission_interaction();

-- Auto-log interactions when bookings happen
create or replace function public.log_booking_interaction()
returns trigger as $$
declare
  interaction_status text;
begin
  -- Map booking status to valid interaction status
  interaction_status := case
    when new.status in ('scheduled', 'completed', 'cancelled', 'no_show') then new.status
    when new.status = 'clicked' then 'scheduled'
    else 'completed'
  end;

  insert into public.interactions (lead_id, type, title, direction, status, metadata)
  values (
    new.lead_id,
    'booking',
    'Booking: ' || coalesce(new.event_type, 'Unknown'),
    'inbound',
    interaction_status,
    jsonb_build_object('provider', new.provider, 'booking_id', new.provider_booking_id, 'payload', new.payload)
  );
  return new;
end;
$$ language plpgsql;

drop trigger if exists auto_log_booking_interaction on public.bookings;
create trigger auto_log_booking_interaction
  after insert on public.bookings
  for each row
  when (new.lead_id is not null)
  execute function public.log_booking_interaction();

-- ─────────────────────────────────────────────
-- G. REPORTING VIEWS — CRM Dashboard
-- ─────────────────────────────────────────────

create or replace view reporting_crm_dashboard as
select
  (select count(*) from public.leads) as total_leads,
  (select count(*) from public.leads where status = 'new') as new_leads,
  (select count(*) from public.leads where status = 'qualified') as qualified_leads,
  (select count(*) from public.deals) as total_deals,
  (select count(*) from public.deals where stage = 'won') as won_deals,
  (select coalesce(sum(value), 0) from public.deals where stage = 'won') as won_revenue,
  (select coalesce(sum(value * probability / 100.0), 0) from public.deals where stage not in ('won', 'lost')) as pipeline_value,
  (select count(*) from public.tasks where status = 'pending' and due_date < now()) as overdue_tasks,
  (select count(*) from public.interactions where created_at > now() - interval '7 days') as interactions_this_week;

grant select on reporting_crm_dashboard to authenticated, service_role;

-- Lead detail view with interaction counts
create or replace view reporting_lead_detail as
select
  l.*,
  (select count(*) from public.interactions where lead_id = l.id) as interaction_count,
  (select count(*) from public.tasks where lead_id = l.id and status != 'completed') as open_tasks,
  (select count(*) from public.deals where lead_id = l.id) as deal_count,
  (select count(*) from public.voice_sessions where lead_id = l.id) as voice_session_count,
  (select count(*) from public.bookings where lead_id = l.id) as booking_count,
  (select max(completed_at) from public.interactions where lead_id = l.id) as last_interaction_at
from public.leads l;

grant select on reporting_lead_detail to authenticated, service_role;
