begin;
set local search_path = public, extensions;
select no_plan();

create temporary table test_audit_id as
select private.write_audit(
  'system',
  'iam.baseline.created',
  'iam.baseline',
  null,
  null,
  '{"status":"created"}'::jsonb,
  '34000000-0000-4000-8000-000000000001',
  '{"source":"pgtap"}'::jsonb,
  null
) as id;

select is(
  (select count(*) from audit.audit_log where id = (select id from test_audit_id)),
  1::bigint,
  'private.write_audit should append one event'
);

select throws_like(
  $$update audit.audit_log set action = 'iam.baseline.changed'$$,
  '%audit log is append-only%',
  'audit rows should reject updates'
);

select throws_like(
  $$delete from audit.audit_log$$,
  '%audit log is append-only%',
  'audit rows should reject deletes'
);

select throws_like(
  $$truncate table audit.audit_log$$,
  '%audit log is append-only%',
  'audit table should reject truncate'
);

set local role authenticated;
select throws_like(
  $$
    insert into audit.audit_log (
      actor_kind, action, entity_type, request_id
    ) values (
      'system', 'iam.fake', 'iam.fake', '34000000-0000-4000-8000-000000000002'
    )
  $$,
  '%permission denied%',
  'authenticated users should not insert audit events directly'
);
reset role;

select * from finish();
rollback;
