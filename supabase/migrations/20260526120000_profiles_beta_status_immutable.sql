# Prevent authenticated clients from self-updating profiles.beta_status.
# OAuth auto-approve (autodsm_default_beta_status) and service_role admin edits still work.

create or replace function public.profiles_preserve_beta_status()
returns trigger
language plpgsql
security definer
set search_path to public
as $$
begin
  if tg_op = 'UPDATE'
     and old.beta_status is distinct from new.beta_status
     and coalesce(auth.role(), '') = 'authenticated' then
    new.beta_status := old.beta_status;
    new.beta_approved_at := old.beta_approved_at;
    new.beta_requested_at := old.beta_requested_at;
  end if;

  return new;
end;
$$;

drop trigger if exists zzz_profiles_preserve_beta_status on public.profiles;
create trigger zzz_profiles_preserve_beta_status
  before update on public.profiles
  for each row
  execute function public.profiles_preserve_beta_status();
