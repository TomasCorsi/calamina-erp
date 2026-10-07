begin;
set local search_path = public, extensions;
select no_plan();

select has_table('public', 'tablero_sesiones', 'dashboard sessions have a v2 table');
select has_function('api', 'list_message_recipients', array['date'], 'messages use a protected v2 RPC');

delete from public.tablero_sesiones;

insert into iam.roles(id,key,name,description,is_system,is_assignable) values
('6f000000-0000-4000-8000-000000000001','final_block_viewer','Final block viewer','Test role.',false,true);
insert into iam.role_permissions(role_id,permission_id)
select '6f000000-0000-4000-8000-000000000001',id from iam.permissions
where key in ('dashboard.view','mensajes.view','reportes.view');

insert into auth.users(id,instance_id,aud,role,email,encrypted_password,email_confirmed_at,raw_app_meta_data,raw_user_meta_data,created_at,updated_at) values
('6f100000-0000-4000-8000-000000000001','00000000-0000-0000-0000-000000000000','authenticated','authenticated','final-none@example.invalid','',now(),'{}','{}',now(),now()),
('6f100000-0000-4000-8000-000000000002','00000000-0000-0000-0000-000000000000','authenticated','authenticated','final-view@example.invalid','',now(),'{}','{}',now(),now()),
('6f100000-0000-4000-8000-000000000003','00000000-0000-0000-0000-000000000000','authenticated','authenticated','final-admin@example.invalid','',now(),'{}','{}',now(),now()),
('6f100000-0000-4000-8000-000000000004','00000000-0000-0000-0000-000000000000','authenticated','authenticated','final-suspended@example.invalid','',now(),'{}','{}',now(),now());

insert into public.company_memberships(id,company_id,user_id,status,suspended_at) values
('6f200000-0000-4000-8000-000000000001','00000000-0000-4000-8000-000000000001','6f100000-0000-4000-8000-000000000001','active',null),
('6f200000-0000-4000-8000-000000000002','00000000-0000-4000-8000-000000000001','6f100000-0000-4000-8000-000000000002','active',null),
('6f200000-0000-4000-8000-000000000003','00000000-0000-4000-8000-000000000001','6f100000-0000-4000-8000-000000000003','active',null),
('6f200000-0000-4000-8000-000000000004','00000000-0000-4000-8000-000000000001','6f100000-0000-4000-8000-000000000004','suspended',now());
insert into iam.user_roles(membership_id,role_id) values
('6f200000-0000-4000-8000-000000000002','6f000000-0000-4000-8000-000000000001'),
('6f200000-0000-4000-8000-000000000003','10000000-0000-4000-8000-000000000001'),
('6f200000-0000-4000-8000-000000000004','10000000-0000-4000-8000-000000000001');

select set_config('request.jwt.claim.sub','6f100000-0000-4000-8000-000000000001',true);
set local role authenticated;
select is((select count(*) from tablero_sesiones),0::bigint,'unauthorized user cannot read dashboard sessions');
select is((select count(*) from api.list_message_recipients(current_date)),0::bigint,'unauthorized user cannot list message recipients');
select throws_like($$insert into tablero_sesiones(nombre) values('Denied')$$,'%row-level security%','unauthorized user cannot create dashboard sessions');
reset role;

select set_config('request.jwt.claim.sub','6f100000-0000-4000-8000-000000000002',true);
set local role authenticated;
select ok((select count(*) from api.list_message_recipients(current_date)) > 0,'authorized user lists only active company recipients');
select is((select count(*) from tablero_sesiones),0::bigint,'view permission does not create implicit dashboard state');
select throws_like($$insert into tablero_sesiones(nombre) values('Denied')$$,'%row-level security%','view permission cannot control dashboard');
reset role;

select set_config('request.jwt.claim.sub','6f100000-0000-4000-8000-000000000003',true);
set local role authenticated;
select lives_ok($$insert into tablero_sesiones(nombre) values('Tablero TV')$$,'admin creates the company dashboard session');
select is((select count(*) from tablero_sesiones),1::bigint,'admin reads the company dashboard session');
select throws_like($$update tablero_sesiones set obra_ids=array['ffffffff-ffff-4fff-8fff-ffffffffffff'::uuid]$$,'%invalid work selection%','dashboard rejects works outside the valid company catalog');
reset role;

select set_config('request.jwt.claim.sub','6f100000-0000-4000-8000-000000000004',true);
set local role authenticated;
select is((select count(*) from tablero_sesiones),0::bigint,'suspended membership cannot read dashboard sessions');
select is((select count(*) from api.list_message_recipients(current_date)),0::bigint,'suspended membership cannot list message recipients');
reset role;

select * from finish();
rollback;
