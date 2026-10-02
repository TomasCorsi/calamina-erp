grant usage on schema public to authenticated;
grant usage on schema private to authenticated;

grant select on table public.companies to authenticated;
grant select on table public.company_settings to authenticated;
grant select on table public.profiles to authenticated;
grant update (display_name) on table public.profiles to authenticated;
grant select on table public.personal to authenticated;
grant select on table public.company_memberships to authenticated;

grant execute on function private.has_active_membership() to authenticated;
grant execute on function private.current_company_id() to authenticated;
grant execute on function private.current_personal_id() to authenticated;
grant execute on function private.has_permission(text) to authenticated;

create policy companies_select_active_member
on public.companies
for select
to authenticated
using (id = (select private.current_company_id()));

create policy company_settings_select_active_member
on public.company_settings
for select
to authenticated
using (company_id = (select private.current_company_id()));

create policy profiles_select_self_or_users_view
on public.profiles
for select
to authenticated
using (
  (
    user_id = (select auth.uid())
    and (select private.has_active_membership())
  )
  or (select private.has_permission('users.view'))
);

create policy profiles_update_self
on public.profiles
for update
to authenticated
using (
  user_id = (select auth.uid())
  and (select private.has_active_membership())
)
with check (
  user_id = (select auth.uid())
  and (select private.has_active_membership())
);

create policy personal_select_self_or_personal_view
on public.personal
for select
to authenticated
using (
  id = (select private.current_personal_id())
  or (select private.has_permission('personal.view'))
);

create policy company_memberships_select_self_or_users_view
on public.company_memberships
for select
to authenticated
using (
  user_id = (select auth.uid())
  or (select private.has_permission('users.view'))
);
