create table if not exists public.qr_routes (
  id text primary key,
  name text not null default '',
  destination text not null,
  enabled boolean not null default true,
  redirect_type text not null default 'single',
  fallback_url text,
  open_in_new_tab boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists qr_routes_updated_at_idx on public.qr_routes(updated_at desc);

create or replace function public.set_qr_routes_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_qr_routes_updated_at on public.qr_routes;
create trigger trg_qr_routes_updated_at
before update on public.qr_routes
for each row
execute function public.set_qr_routes_updated_at();

alter table public.qr_routes enable row level security;

drop policy if exists "service_role_manage_qr_routes" on public.qr_routes;
create policy "service_role_manage_qr_routes"
on public.qr_routes
for all
using (auth.role() = 'service_role')
with check (auth.role() = 'service_role');
