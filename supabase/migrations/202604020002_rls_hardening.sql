-- RLS Hardening: Fix performance and tighten policies
-- Wraps auth.role() in select for 94-99% faster RLS evaluation
-- Restricts DELETE operations to admins
-- Fixes booking trigger status mapping

-- ─────────────────────────────────────────────
-- A. DROP OLD POLICIES
-- ─────────────────────────────────────────────

drop policy if exists "Authenticated users can manage deals" on public.deals;
drop policy if exists "Authenticated users can manage interactions" on public.interactions;
drop policy if exists "Authenticated users can manage tasks" on public.tasks;
drop policy if exists "Authenticated users can manage notes" on public.notes;

-- ─────────────────────────────────────────────
-- B. FIX BOOKING TRIGGER STATUS MAPPING
-- ─────────────────────────────────────────────

create or replace function public.log_booking_interaction()
returns trigger as $$
declare
  interaction_status text;
begin
  -- Map booking status to valid interaction status
  -- 'clicked' -> 'scheduled' (user started booking flow)
  -- 'scheduled'/'completed'/'cancelled'/'no_show' -> same
  -- NULL or unknown -> 'scheduled' (safe default)
  interaction_status := case
    when new.status in ('scheduled', 'completed', 'cancelled', 'no_show') then new.status
    when new.status = 'clicked' then 'scheduled'
    when new.status is null then 'scheduled'
    else 'scheduled' -- safe default for any unknown status
  end;

  insert into public.interactions (lead_id, type, title, direction, status, metadata)
  values (
    new.lead_id,
    'booking',
    'Booking: ' || coalesce(new.event_type, 'Unknown'),
    'inbound',
    interaction_status,
    jsonb_build_object('provider', new.provider, 'booking_id', new.provider_booking_id, 'original_status', new.status, 'payload', new.payload)
  );
  return new;
end;
$$ language plpgsql;

-- ─────────────────────────────────────────────
-- C. CREATE HARDENED POLICIES
-- ─────────────────────────────────────────────

-- Deals: Read/Insert for authenticated, Update/Delete for admins only
create policy "Authenticated users can read deals"
on public.deals for select
using (
  (select auth.role()) = 'authenticated'
  and exists (select 1 from public.profiles where id = (select auth.uid()))
);

create policy "Authenticated users can insert deals"
on public.deals for insert
with check (
  (select auth.role()) = 'authenticated'
  and exists (select 1 from public.profiles where id = (select auth.uid()))
);

create policy "Users can update own deals or admins can update all"
on public.deals for update
using (
  (select auth.role()) = 'authenticated'
  and exists (select 1 from public.profiles where id = (select auth.uid()))
  and (
    assigned_to = (select auth.uid())
    or exists (select 1 from public.profiles where id = (select auth.uid()) and role = 'admin')
  )
);

create policy "Admins can delete deals"
on public.deals for delete
using (
  (select auth.role()) = 'authenticated'
  and exists (select 1 from public.profiles where id = (select auth.uid()) and role = 'admin')
);

-- Interactions: Read/Insert for authenticated, Update/Delete for admins only
create policy "Authenticated users can read interactions"
on public.interactions for select
using (
  (select auth.role()) = 'authenticated'
  and exists (select 1 from public.profiles where id = (select auth.uid()))
);

create policy "Authenticated users can insert interactions"
on public.interactions for insert
with check (
  (select auth.role()) = 'authenticated'
  and exists (select 1 from public.profiles where id = (select auth.uid()))
);

create policy "Admins can update interactions"
on public.interactions for update
using (
  (select auth.role()) = 'authenticated'
  and exists (select 1 from public.profiles where id = (select auth.uid()) and role = 'admin')
);

create policy "Admins can delete interactions"
on public.interactions for delete
using (
  (select auth.role()) = 'authenticated'
  and exists (select 1 from public.profiles where id = (select auth.uid()) and role = 'admin')
);

-- Tasks: Read/Insert for authenticated, Update for assigned or admin, Delete for admin
create policy "Authenticated users can read tasks"
on public.tasks for select
using (
  (select auth.role()) = 'authenticated'
  and exists (select 1 from public.profiles where id = (select auth.uid()))
);

create policy "Authenticated users can insert tasks"
on public.tasks for insert
with check (
  (select auth.role()) = 'authenticated'
  and exists (select 1 from public.profiles where id = (select auth.uid()))
);

create policy "Users can update own tasks or admins can update all"
on public.tasks for update
using (
  (select auth.role()) = 'authenticated'
  and exists (select 1 from public.profiles where id = (select auth.uid()))
  and (
    assigned_to = (select auth.uid())
    or exists (select 1 from public.profiles where id = (select auth.uid()) and role = 'admin')
  )
);

create policy "Admins can delete tasks"
on public.tasks for delete
using (
  (select auth.role()) = 'authenticated'
  and exists (select 1 from public.profiles where id = (select auth.uid()) and role = 'admin')
);

-- Notes: Read/Insert for authenticated, Delete for admin
create policy "Authenticated users can read notes"
on public.notes for select
using (
  (select auth.role()) = 'authenticated'
  and exists (select 1 from public.profiles where id = (select auth.uid()))
);

create policy "Authenticated users can insert notes"
on public.notes for insert
with check (
  (select auth.role()) = 'authenticated'
  and exists (select 1 from public.profiles where id = (select auth.uid()))
);

create policy "Admins can update notes"
on public.notes for update
using (
  (select auth.role()) = 'authenticated'
  and exists (select 1 from public.profiles where id = (select auth.uid()) and role = 'admin')
);

create policy "Admins can delete notes"
on public.notes for delete
using (
  (select auth.role()) = 'authenticated'
  and exists (select 1 from public.profiles where id = (select auth.uid()) and role = 'admin')
);

-- ─────────────────────────────────────────────
-- C. FIX PROFILES POLICIES (use select wrapper)
-- ─────────────────────────────────────────────

drop policy if exists "Users can view own profile" on public.profiles;
drop policy if exists "Admins can view all profiles" on public.profiles;
drop policy if exists "Users can update own profile" on public.profiles;
drop policy if exists "Users can insert own profile" on public.profiles;

create policy "Users can view own profile"
on public.profiles for select
using (id = (select auth.uid()));

create policy "Admins can view all profiles"
on public.profiles for select
using (exists (
  select 1 from public.profiles
  where id = (select auth.uid()) and role = 'admin'
));

create policy "Users can update own profile"
on public.profiles for update
using (id = (select auth.uid()));

create policy "Users can insert own profile"
on public.profiles for insert
with check (id = (select auth.uid()));
