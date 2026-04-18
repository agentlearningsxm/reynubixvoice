-- Migration: Admin Authentication System
-- Created: 2026-04-02
-- Purpose: Add admin_profiles table for role-based access control

-- Admin profiles table (extends Supabase auth.users)
create table if not exists public.admin_profiles (
  id uuid references auth.users(id) on delete cascade primary key,
  role text not null default 'viewer' check (role in ('admin', 'viewer')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Enable RLS
alter table public.admin_profiles enable row level security;

-- RLS policies for admin_profiles
create policy "Admins can view all profiles"
  on public.admin_profiles for select
  using (
    exists (
      select 1 from public.admin_profiles ap
      where ap.id = auth.uid() and ap.role = 'admin'
    )
  );

create policy "Users can view their own profile"
  on public.admin_profiles for select
  using (auth.uid() = id);

create policy "Only admins can update profiles"
  on public.admin_profiles for update
  using (
    exists (
      select 1 from public.admin_profiles ap
      where ap.id = auth.uid() and ap.role = 'admin'
    )
  );

-- Updated_at trigger
create or replace function public.handle_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger set_updated_at
  before update on public.admin_profiles
  for each row
  execute function public.handle_updated_at();

-- Login audit log
create table if not exists public.login_audit (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) on delete set null,
  email text,
  success boolean not null,
  ip_address text,
  user_agent text,
  created_at timestamptz not null default now()
);

alter table public.login_audit enable row level security;

create policy "Only admins can view login audit"
  on public.login_audit for select
  using (
    exists (
      select 1 from public.admin_profiles ap
      where ap.id = auth.uid() and ap.role = 'admin'
    )
  );

-- Index for faster lookups
create index if not exists idx_admin_profiles_role on public.admin_profiles(role);
create index if not exists idx_login_audit_user_id on public.login_audit(user_id);
create index if not exists idx_login_audit_created_at on public.login_audit(created_at desc);
