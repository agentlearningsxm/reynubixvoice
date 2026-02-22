create table if not exists public.qr_studio_configs (
  id uuid default gen_random_uuid() primary key,
  state jsonb not null,
  short_code text unique not null,
  scan_count integer default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.qr_studio_leads (
  id uuid default gen_random_uuid() primary key,
  config_id uuid references public.qr_studio_configs(id) on delete cascade,
  lead_data jsonb not null,
  captured_at timestamptz not null default now()
);

alter table public.qr_studio_configs enable row level security;
alter table public.qr_studio_leads enable row level security;

-- Basic policies for anonymous access to redirect/tracking and creating configs
create policy "Allow anon insert configs" on public.qr_studio_configs for insert with check (true);
create policy "Allow anon select configs" on public.qr_studio_configs for select using (true);
create policy "Allow anon update configs" on public.qr_studio_configs for update using (true);

create policy "Allow anon insert leads" on public.qr_studio_leads for insert with check (true);
create policy "Allow anon select leads" on public.qr_studio_leads for select using (true);
