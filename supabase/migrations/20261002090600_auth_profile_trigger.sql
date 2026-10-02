create or replace function private.handle_new_auth_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  profile_display_name text;
begin
  profile_display_name := coalesce(
    nullif(btrim(new.raw_user_meta_data ->> 'display_name'), ''),
    nullif(btrim(new.raw_user_meta_data ->> 'full_name'), ''),
    'Usuario'
  );

  insert into public.profiles (user_id, display_name)
  values (new.id, left(profile_display_name, 120))
  on conflict (user_id) do nothing;

  return new;
end;
$$;

revoke execute on function private.handle_new_auth_user()
  from public, anon, authenticated, service_role;

create trigger on_auth_user_created_v2
after insert on auth.users
for each row execute function private.handle_new_auth_user();
