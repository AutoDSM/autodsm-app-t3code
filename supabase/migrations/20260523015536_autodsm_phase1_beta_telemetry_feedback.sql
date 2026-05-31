# AutoDSM Phase 1 — beta gate helpers, telemetry, feedback, publish stats.
# Applied remotely as migration 20260523015536_autodsm_phase1_beta_telemetry_feedback.

create or replace function public.autodsm_default_beta_status()
returns trigger
language plpgsql
security definer
set search_path to public
as $$
begin
  if new.beta_status is null or new.beta_status = 'pending' then
    if new.provider in ('github', 'google') then
      new.beta_status := 'approved';
      new.beta_approved_at := coalesce(new.beta_approved_at, now());
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists autodsm_profiles_default_beta_status on public.profiles;
create trigger autodsm_profiles_default_beta_status
  before insert or update on public.profiles
  for each row
  execute function public.autodsm_default_beta_status();

create table if not exists public.telemetry_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  event_name text not null,
  event_version smallint not null default 1,
  properties jsonb not null default '{}'::jsonb,
  client_session_id text,
  app_version text,
  platform text,
  created_at timestamptz not null default now()
);

alter table public.telemetry_events enable row level security;

create policy telemetry_events_insert_own
  on public.telemetry_events
  for insert
  to authenticated
  with check (auth.uid() = user_id);

create policy telemetry_events_select_own
  on public.telemetry_events
  for select
  to authenticated
  using (auth.uid() = user_id);

create table if not exists public.feedback_submissions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  category text not null default 'general',
  message text not null,
  rating smallint,
  app_version text,
  platform text,
  created_at timestamptz not null default now()
);

alter table public.feedback_submissions enable row level security;

create policy feedback_submissions_insert_own
  on public.feedback_submissions
  for insert
  to authenticated
  with check (auth.uid() = user_id);

create policy feedback_submissions_select_own
  on public.feedback_submissions
  for select
  to authenticated
  using (auth.uid() = user_id);

create table if not exists public.publish_stats (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  workspace_id_hash text not null,
  package_name_hash text,
  version text not null,
  component_count integer,
  token_count integer,
  created_at timestamptz not null default now()
);

alter table public.publish_stats enable row level security;

create policy publish_stats_insert_own
  on public.publish_stats
  for insert
  to authenticated
  with check (auth.uid() = user_id);

create policy publish_stats_select_own
  on public.publish_stats
  for select
  to authenticated
  using (auth.uid() = user_id);
