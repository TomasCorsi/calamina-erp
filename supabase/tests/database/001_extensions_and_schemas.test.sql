begin;
set local search_path = public, extensions;
select no_plan();

select has_extension('pgcrypto', 'pgcrypto extension should exist');
select has_extension('citext', 'citext extension should exist');
select has_extension('pgtap', 'pgtap extension should exist');

select has_schema('iam', 'iam schema should exist');
select has_schema('audit', 'audit schema should exist');
select has_schema('private', 'private schema should exist');

select has_table('public', 'companies', 'companies table should exist');
select has_table('public', 'company_settings', 'company_settings table should exist');
select has_table('public', 'profiles', 'profiles table should exist');
select has_table('public', 'personal', 'personal table should exist');
select has_table('public', 'company_memberships', 'company_memberships table should exist');
select has_table('iam', 'roles', 'roles table should exist');
select has_table('iam', 'permissions', 'permissions table should exist');
select has_table('iam', 'role_permissions', 'role_permissions table should exist');
select has_table('iam', 'user_roles', 'user_roles table should exist');
select has_table('iam', 'registration_invitations', 'registration invitations should exist');
select has_table('audit', 'audit_log', 'audit log should exist');

select has_function('private', 'has_permission', array['text'], 'has_permission should exist');
select has_function('private', 'current_company_id', array[]::text[], 'current_company_id should exist');
select has_function('private', 'current_personal_id', array[]::text[], 'current_personal_id should exist');

select * from finish();
rollback;
