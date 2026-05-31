# AutoDSM profiles table, auth sync trigger, and RLS policies.
# Applied remotely as migration 20260514181252_profiles_and_rls.

create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  email text,
  display_name text,
  avatar_url text,
  provider text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  beta_status text not null default 'approved',
  beta_requested_at timestamptz,
  beta_approved_at timestamptz
);

alter table public.profiles enable row level security;

create policy profiles_select_own
  on public.profiles
  for select
  to authenticated
  using ((select auth.uid()) = id);

create policy profiles_update_own
  on public.profiles
  for update
  to authenticated
  using ((select auth.uid()) = id)
  with check ((select auth.uid()) = id);

create schema if not exists private;

create or replace function private.handle_auth_user_change()
returns trigger
language plpgsql
security definer
set search_path to public
as $$
declare
  dn text;
  av text;
  prov text;
begin
  dn := coalesce(
    new.raw_user_meta_data->>'full_name',
    new.raw_user_meta_data->>'name',
    new.raw_user_meta_data->>'user_name',
    new.raw_user_meta_data->>'preferred_username',
    nullif(trim(split_part(coalesce(new.email, ''), '@', 1)), '')
  );
  av := coalesce(
    new.raw_user_meta_data->>'avatar_url',
    new.raw_user_meta_data->>'picture'
  );
  prov := coalesce(new.raw_app_meta_data->>'provider', new.raw_user_meta_data->>'provider');

  insert into public.profiles (
    id, email, display_name, avatar_url, provider, updated_at
  )
  values (
    new.id,
    new.email,
    dn,
    av,
    prov,
    now()
  )
  on conflict (id) do update set
    email = excluded.email,
    display_name = coalesce(excluded.display_name, public.profiles.display_name),
    avatar_url = coalesce(excluded.avatar_url, public.profiles.avatar_url),
    provider = coalesce(excluded.provider, public.profiles.provider),
    updated_at = now();

  return new;
end;
$$;

drop trigger if exists on_auth_user_insert_or_update on auth.users;
create trigger on_auth_user_insert_or_update
  after insert or update on auth.users
  for each row
  execute function private.handle_auth_user_change();
