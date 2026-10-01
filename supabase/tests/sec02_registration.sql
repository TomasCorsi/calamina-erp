-- SEC-02 EXPAND integration tests.
--
-- Run only against an isolated staging/test database after applying the EXPAND
-- migration, using psql and a database-owner connection that may SET ROLE to
-- anon and authenticated:
--   psql "$STAGING_DATABASE_URL" -v ON_ERROR_STOP=1 \
--     -f supabase/tests/sec02_registration.sql
--
-- The entire suite is rolled back. It intentionally inserts auth.users rows to
-- exercise the real on_auth_user_created trigger; never run it in production.

\set ON_ERROR_STOP on

BEGIN;

CREATE TEMP TABLE sec02_test_state (
  key text PRIMARY KEY,
  value text NOT NULL
) ON COMMIT DROP;

CREATE OR REPLACE FUNCTION pg_temp.sec02_assert(
  p_condition boolean,
  p_message text
)
RETURNS void
LANGUAGE plpgsql
AS $function$
BEGIN
  IF NOT COALESCE(p_condition, false) THEN
    RAISE EXCEPTION 'SEC-02 assertion failed: %', p_message;
  END IF;
END;
$function$;

CREATE OR REPLACE FUNCTION pg_temp.sec02_assert_raises(
  p_sql text,
  p_expected_sqlstate text,
  p_message text
)
RETURNS void
LANGUAGE plpgsql
AS $function$
DECLARE
  v_sqlstate text;
BEGIN
  BEGIN
    EXECUTE p_sql;
  EXCEPTION WHEN OTHERS THEN
    GET STACKED DIAGNOSTICS v_sqlstate = RETURNED_SQLSTATE;
    IF v_sqlstate <> p_expected_sqlstate THEN
      RAISE EXCEPTION
        'SEC-02 assertion failed: % (expected SQLSTATE %, got %)',
        p_message,
        p_expected_sqlstate,
        v_sqlstate;
    END IF;
    RETURN;
  END;

  RAISE EXCEPTION
    'SEC-02 assertion failed: % (statement did not fail)',
    p_message;
END;
$function$;

CREATE OR REPLACE FUNCTION pg_temp.sec02_assert_role_cannot_select(
  p_role name,
  p_sql text,
  p_message text
)
RETURNS void
LANGUAGE plpgsql
AS $function$
DECLARE
  v_denied boolean := false;
  v_sqlstate text;
BEGIN
  EXECUTE pg_catalog.format('SET LOCAL ROLE %I', p_role);

  BEGIN
    EXECUTE p_sql;
  EXCEPTION WHEN OTHERS THEN
    GET STACKED DIAGNOSTICS v_sqlstate = RETURNED_SQLSTATE;
    IF v_sqlstate = '42501' THEN
      v_denied := true;
    ELSE
      EXECUTE 'RESET ROLE';
      RAISE EXCEPTION
        'SEC-02 assertion failed: % (expected SQLSTATE 42501, got %)',
        p_message,
        v_sqlstate;
    END IF;
  END;

  EXECUTE 'RESET ROLE';

  IF NOT v_denied THEN
    RAISE EXCEPTION
      'SEC-02 assertion failed: % (SELECT unexpectedly succeeded)',
      p_message;
  END IF;
END;
$function$;

-- This helper depends only on stable columns from the Supabase auth.users
-- schema. If Lovable Cloud has customized auth.users, adapt this helper only.
CREATE OR REPLACE FUNCTION pg_temp.sec02_insert_auth_user(
  p_user_id uuid,
  p_email text,
  p_metadata jsonb
)
RETURNS void
LANGUAGE plpgsql
AS $function$
BEGIN
  INSERT INTO auth.users (
    id,
    instance_id,
    aud,
    role,
    email,
    encrypted_password,
    raw_app_meta_data,
    raw_user_meta_data,
    created_at,
    updated_at
  )
  VALUES (
    p_user_id,
    '00000000-0000-0000-0000-000000000000'::uuid,
    'authenticated',
    'authenticated',
    p_email,
    '',
    '{"provider":"email","providers":["email"]}'::jsonb,
    COALESCE(p_metadata, '{}'::jsonb),
    pg_catalog.now(),
    pg_catalog.now()
  );
END;
$function$;

INSERT INTO sec02_test_state (key, value)
VALUES
  ('admin_id', pg_catalog.gen_random_uuid()::text),
  ('non_admin_id', pg_catalog.gen_random_uuid()::text),
  ('personal_create', pg_catalog.gen_random_uuid()::text),
  ('personal_inactive_create', pg_catalog.gen_random_uuid()::text),
  ('personal_inactive_consume', pg_catalog.gen_random_uuid()::text),
  ('personal_linked', pg_catalog.gen_random_uuid()::text),
  ('personal_manipulated', pg_catalog.gen_random_uuid()::text),
  ('personal_legacy_admin', pg_catalog.gen_random_uuid()::text),
  ('personal_race', pg_catalog.gen_random_uuid()::text),
  ('personal_atomic', pg_catalog.gen_random_uuid()::text),
  ('personal_legacy', pg_catalog.gen_random_uuid()::text);

SELECT pg_temp.sec02_insert_auth_user(
  (SELECT value::uuid FROM sec02_test_state WHERE key = 'admin_id'),
  'sec02-admin@example.test',
  '{"nombre_completo":"SEC-02 Admin"}'::jsonb
);

SELECT pg_temp.sec02_insert_auth_user(
  (SELECT value::uuid FROM sec02_test_state WHERE key = 'non_admin_id'),
  'sec02-user@example.test',
  '{"nombre_completo":"SEC-02 User"}'::jsonb
);

INSERT INTO public.user_roles (user_id, role)
VALUES (
  (SELECT value::uuid FROM sec02_test_state WHERE key = 'admin_id'),
  'admin'::public.app_role
);

INSERT INTO public.personal (
  id,
  nombre,
  apellido,
  dni,
  rol,
  activo,
  telefono,
  fecha_ingreso,
  legajo
)
SELECT
  s.value::uuid,
  'SEC02',
  s.key,
  'SEC02-DNI-' || s.key,
  CASE
    WHEN s.key = 'personal_legacy_admin'
      THEN 'administrativo'::public.rol_personal
    WHEN s.key = 'personal_legacy'
      THEN 'capataz'::public.rol_personal
    ELSE 'maquinista'::public.rol_personal
  END,
  s.key <> 'personal_inactive_create',
  '0000000000',
  CURRENT_DATE,
  'SEC02-LEG-' || s.key
FROM sec02_test_state AS s
WHERE s.key LIKE 'personal_%';

-- Permissions: frontend roles have no table access; authenticated may execute
-- only the guarded RPCs.
SELECT pg_temp.sec02_assert(
  NOT pg_catalog.has_table_privilege(
    'anon',
    'public.registration_invitations',
    'SELECT'
  ),
  'anon must not read registration_invitations'
);
SELECT pg_temp.sec02_assert(
  NOT pg_catalog.has_table_privilege(
    'authenticated',
    'public.registration_invitations',
    'SELECT,INSERT,UPDATE,DELETE'
  ),
  'authenticated must not access registration_invitations directly'
);

-- Exercise the effective roles as well as inspecting catalog privileges. An
-- explicit token_hash read must fail for both frontend roles.
SELECT pg_temp.sec02_assert_role_cannot_select(
  'anon',
  'SELECT token_hash FROM public.registration_invitations LIMIT 1',
  'anon must not read token_hash directly'
);

SELECT pg_temp.sec02_assert_role_cannot_select(
  'authenticated',
  'SELECT token_hash FROM public.registration_invitations LIMIT 1',
  'authenticated must not read token_hash directly'
);

SELECT pg_temp.sec02_assert(
  pg_catalog.has_function_privilege(
    'authenticated',
    'public.admin_create_registration_invitation(text,text,public.app_role,uuid)',
    'EXECUTE'
  ),
  'authenticated must be able to invoke the guarded create RPC'
);
SELECT pg_temp.sec02_assert(
  NOT pg_catalog.has_function_privilege(
    'anon',
    'public.admin_create_registration_invitation(text,text,public.app_role,uuid)',
    'EXECUTE'
  ),
  'anon must not execute the create RPC'
);

-- A non-admin can reach the authenticated RPC grant but fails server-side.
SELECT pg_catalog.set_config(
  'request.jwt.claim.sub',
  (SELECT value FROM sec02_test_state WHERE key = 'non_admin_id'),
  true
);
SELECT pg_temp.sec02_assert_raises(
  $sql$
    SELECT *
      FROM public.admin_create_registration_invitation(
        'sec02-denied@example.test',
        'Denied',
        'contador'::public.app_role,
        NULL
      )
  $sql$,
  '42501',
  'a non-admin must not create invitations'
);

-- All remaining RPC calls use the admin fixture.
SELECT pg_catalog.set_config(
  'request.jwt.claim.sub',
  (SELECT value FROM sec02_test_state WHERE key = 'admin_id'),
  true
);

-- Admin invitations are forbidden by the RPC and by the table constraint.
SELECT pg_temp.sec02_assert_raises(
  $sql$
    SELECT *
      FROM public.admin_create_registration_invitation(
        'sec02-forbidden-admin@example.test',
        'Forbidden Admin',
        'admin'::public.app_role,
        NULL
      )
  $sql$,
  '22023',
  'the create RPC must reject role admin'
);

SELECT pg_temp.sec02_assert_raises(
  pg_catalog.format(
    $sql$
      INSERT INTO public.registration_invitations (
        token_hash,
        email_normalized,
        display_name,
        personal_id,
        role,
        created_by,
        expires_at
      ) VALUES (
        extensions.digest('direct-admin-token', 'sha256'),
        'sec02-direct-admin@example.test',
        'Direct Admin',
        %L::uuid,
        'admin'::public.app_role,
        %L::uuid,
        pg_catalog.now() + interval '72 hours'
      )
    $sql$,
    (SELECT value FROM sec02_test_state WHERE key = 'personal_create'),
    (SELECT value FROM sec02_test_state WHERE key = 'admin_id')
  ),
  '23514',
  'the table constraint must reject role admin'
);
SELECT pg_temp.sec02_assert(
  NOT EXISTS (
    SELECT 1
      FROM public.registration_invitations
     WHERE role = 'admin'::public.app_role
        OR email_normalized IN (
          'sec02-forbidden-admin@example.test',
          'sec02-direct-admin@example.test'
        )
  ),
  'rejected admin invitations must not leave persisted rows'
);

-- Operational roles require personal_id.
SELECT pg_temp.sec02_assert_raises(
  $sql$
    SELECT *
      FROM public.admin_create_registration_invitation(
        'sec02-no-personal@example.test',
        'No Personal',
        'maquinista'::public.app_role,
        NULL
      )
  $sql$,
  '22023',
  'an operational invitation must require personal_id'
);

-- Inactive personal cannot receive an invitation.
SELECT pg_temp.sec02_assert_raises(
  pg_catalog.format(
    $sql$
      SELECT * FROM public.admin_create_registration_invitation(
        'sec02-inactive-create@example.test',
        'Inactive At Creation',
        'maquinista'::public.app_role,
        %L::uuid
      )
    $sql$,
    (
      SELECT value
        FROM sec02_test_state
       WHERE key = 'personal_inactive_create'
    )
  ),
  '22023',
  'inactive personal must be rejected when creating an invitation'
);
SELECT pg_temp.sec02_assert(
  NOT EXISTS (
    SELECT 1
      FROM public.registration_invitations
     WHERE email_normalized = 'sec02-inactive-create@example.test'
  ),
  'rejected inactive personal must not leave an invitation'
);

-- A valid operational invitation returns a one-time token, stores only its
-- digest, and expires in 72 hours.
DO $test$
DECLARE
  v_result record;
  v_row public.registration_invitations%ROWTYPE;
BEGIN
  SELECT *
    INTO v_result
    FROM public.admin_create_registration_invitation(
      '  SEC02-OPERATIVE@Example.Test  ',
      '  Operative User  ',
      'maquinista'::public.app_role,
      (SELECT value::uuid FROM sec02_test_state WHERE key = 'personal_create')
    );

  SELECT * INTO v_row
    FROM public.registration_invitations
   WHERE id = v_result.invitation_id;

  PERFORM pg_temp.sec02_assert(
    pg_catalog.char_length(v_result.token) = 64
      AND v_result.token ~ '^[0-9a-f]{64}$',
    'the returned token must encode 32 random bytes as lowercase hex'
  );
  PERFORM pg_temp.sec02_assert(
    v_row.email_normalized = 'sec02-operative@example.test'
      AND v_row.display_name = 'Operative User',
    'email and display name must be normalized'
  );
  PERFORM pg_temp.sec02_assert(
    v_row.token_hash = extensions.digest(v_result.token, 'sha256'),
    'the stored token hash must match SHA-256(token)'
  );
  PERFORM pg_temp.sec02_assert(
    v_row.token_hash <> pg_catalog.decode(v_result.token, 'hex'),
    'the raw token bytes must not be stored'
  );
  PERFORM pg_temp.sec02_assert(
    pg_catalog.abs(
      EXTRACT(EPOCH FROM (v_row.expires_at - v_row.created_at))
      - 259200
    ) < 1,
    'the invitation must expire in 72 hours'
  );

  INSERT INTO sec02_test_state (key, value)
  VALUES
    ('operative_invitation_id', v_result.invitation_id::text),
    ('operative_token', v_result.token);
END;
$test$;

-- Deleting an audit actor must preserve invitation history and timestamps
-- while clearing the three auth.users references through ON DELETE SET NULL.
DO $test$
DECLARE
  v_actor_id uuid := pg_catalog.gen_random_uuid();
  v_used_invitation_id uuid;
  v_revoked_invitation_id uuid;
BEGIN
  PERFORM pg_temp.sec02_insert_auth_user(
    v_actor_id,
    'sec02-deleted-audit-actor@example.test',
    '{"nombre_completo":"Deleted Audit Actor"}'::jsonb
  );

  INSERT INTO public.registration_invitations (
    token_hash,
    email_normalized,
    display_name,
    role,
    created_by,
    expires_at,
    used_by,
    used_at
  ) VALUES (
    extensions.digest('sec02-deleted-used-actor', 'sha256'),
    'sec02-deleted-used-actor@example.test',
    'Deleted Used Actor',
    'contador'::public.app_role,
    v_actor_id,
    pg_catalog.now() + interval '72 hours',
    v_actor_id,
    pg_catalog.now()
  )
  RETURNING id INTO v_used_invitation_id;

  INSERT INTO public.registration_invitations (
    token_hash,
    email_normalized,
    display_name,
    role,
    created_by,
    expires_at,
    revoked_by,
    revoked_at
  ) VALUES (
    extensions.digest('sec02-deleted-revoked-actor', 'sha256'),
    'sec02-deleted-revoked-actor@example.test',
    'Deleted Revoked Actor',
    'contador'::public.app_role,
    v_actor_id,
    pg_catalog.now() + interval '72 hours',
    v_actor_id,
    pg_catalog.now()
  )
  RETURNING id INTO v_revoked_invitation_id;

  DELETE FROM auth.users WHERE id = v_actor_id;

  PERFORM pg_temp.sec02_assert(
    EXISTS (
      SELECT 1
        FROM public.registration_invitations
       WHERE id = v_used_invitation_id
         AND created_by IS NULL
         AND used_by IS NULL
         AND used_at IS NOT NULL
    )
      AND EXISTS (
        SELECT 1
          FROM public.registration_invitations
         WHERE id = v_revoked_invitation_id
           AND created_by IS NULL
           AND revoked_by IS NULL
           AND revoked_at IS NOT NULL
      ),
    'deleted actors must not erase invitation history or timestamps'
  );
END;
$test$;

-- A non-admin cannot revoke an invitation, and the failed call must not alter
-- its pending state.
DO $test$
DECLARE
  v_result record;
BEGIN
  SELECT * INTO v_result
    FROM public.admin_create_registration_invitation(
      'sec02-revoke-denied@example.test',
      'Revoke Denied',
      'contador'::public.app_role,
      NULL
    );

  PERFORM pg_catalog.set_config(
    'request.jwt.claim.sub',
    (SELECT value FROM sec02_test_state WHERE key = 'non_admin_id'),
    true
  );
  PERFORM pg_temp.sec02_assert_raises(
    pg_catalog.format(
      'SELECT public.admin_revoke_registration_invitation(%L::uuid)',
      v_result.invitation_id
    ),
    '42501',
    'a non-admin must not revoke invitations'
  );
  PERFORM pg_catalog.set_config(
    'request.jwt.claim.sub',
    (SELECT value FROM sec02_test_state WHERE key = 'admin_id'),
    true
  );

  PERFORM pg_temp.sec02_assert(
    EXISTS (
      SELECT 1
        FROM public.registration_invitations
       WHERE id = v_result.invitation_id
         AND used_at IS NULL
         AND used_by IS NULL
         AND revoked_at IS NULL
         AND revoked_by IS NULL
    ),
    'failed non-admin revocation must preserve the pending invitation'
  );
END;
$test$;

-- Expired invitation cannot be consumed and leaves no partial auth/profile.
DO $test$
DECLARE
  v_result record;
  v_user_id uuid := pg_catalog.gen_random_uuid();
BEGIN
  SELECT * INTO v_result
    FROM public.admin_create_registration_invitation(
      'sec02-expired@example.test',
      'Expired User',
      'contador'::public.app_role,
      NULL
    );

  UPDATE public.registration_invitations
     SET created_at = pg_catalog.now() - interval '73 hours',
         expires_at = pg_catalog.now() - interval '1 hour'
   WHERE id = v_result.invitation_id;

  PERFORM pg_temp.sec02_assert_raises(
    pg_catalog.format(
      'SELECT pg_temp.sec02_insert_auth_user(%L::uuid, %L, %L::jsonb)',
      v_user_id,
      'sec02-expired@example.test',
      pg_catalog.jsonb_build_object(
        'registration_invite_token',
        v_result.token
      )::text
    ),
    'P0001',
    'an expired invitation must not be consumed'
  );

  PERFORM pg_temp.sec02_assert(
    NOT EXISTS (SELECT 1 FROM auth.users WHERE id = v_user_id)
      AND NOT EXISTS (SELECT 1 FROM public.profiles WHERE user_id = v_user_id)
      AND EXISTS (
        SELECT 1 FROM public.registration_invitations
         WHERE id = v_result.invitation_id AND used_at IS NULL
      ),
    'expired signup must roll back every partial change'
  );
END;
$test$;

-- Personal is checked again at consumption time. An invitation created while
-- active becomes unusable if the personal record is later deactivated.
DO $test$
DECLARE
  v_result record;
  v_user_id uuid := pg_catalog.gen_random_uuid();
  v_personal_id uuid := (
    SELECT value::uuid
      FROM sec02_test_state
     WHERE key = 'personal_inactive_consume'
  );
BEGIN
  SELECT * INTO v_result
    FROM public.admin_create_registration_invitation(
      'sec02-inactive-consume@example.test',
      'Inactive At Consumption',
      'maquinista'::public.app_role,
      v_personal_id
    );

  UPDATE public.personal
     SET activo = false
   WHERE id = v_personal_id;

  PERFORM pg_temp.sec02_assert_raises(
    pg_catalog.format(
      'SELECT pg_temp.sec02_insert_auth_user(%L::uuid, %L, %L::jsonb)',
      v_user_id,
      'sec02-inactive-consume@example.test',
      pg_catalog.jsonb_build_object(
        'registration_invite_token',
        v_result.token
      )::text
    ),
    'P0001',
    'personal deactivated after invitation creation must not consume it'
  );

  PERFORM pg_temp.sec02_assert(
    NOT EXISTS (SELECT 1 FROM auth.users WHERE id = v_user_id)
      AND NOT EXISTS (SELECT 1 FROM public.profiles WHERE user_id = v_user_id)
      AND NOT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = v_user_id)
      AND EXISTS (
        SELECT 1
          FROM public.personal
         WHERE id = v_personal_id
           AND activo IS FALSE
           AND user_id IS NULL
      )
      AND EXISTS (
        SELECT 1
          FROM public.registration_invitations
         WHERE id = v_result.invitation_id
           AND used_at IS NULL
           AND used_by IS NULL
           AND revoked_at IS NULL
      ),
    'inactive consumption must roll back user, profile, role, link and use state'
  );
END;
$test$;

-- Revocation is idempotent, but a consumed invitation cannot be revoked.
DO $test$
DECLARE
  v_result record;
  v_user_id uuid := pg_catalog.gen_random_uuid();
BEGIN
  SELECT * INTO v_result
    FROM public.admin_create_registration_invitation(
      'sec02-revoked@example.test',
      'Revoked User',
      'contador'::public.app_role,
      NULL
    );

  PERFORM pg_temp.sec02_assert(
    public.admin_revoke_registration_invitation(v_result.invitation_id),
    'first revocation must succeed'
  );
  PERFORM pg_temp.sec02_assert(
    public.admin_revoke_registration_invitation(v_result.invitation_id),
    'repeated revocation must be idempotent'
  );
  PERFORM pg_temp.sec02_assert_raises(
    pg_catalog.format(
      'SELECT pg_temp.sec02_insert_auth_user(%L::uuid, %L, %L::jsonb)',
      v_user_id,
      'sec02-revoked@example.test',
      pg_catalog.jsonb_build_object(
        'registration_invite_token',
        v_result.token
      )::text
    ),
    'P0001',
    'a revoked invitation must not be consumed'
  );
END;
$test$;

-- Email comparison is normalized and exact.
DO $test$
DECLARE
  v_result record;
  v_user_id uuid := pg_catalog.gen_random_uuid();
BEGIN
  SELECT * INTO v_result
    FROM public.admin_create_registration_invitation(
      'sec02-bound@example.test',
      'Email Bound',
      'contador'::public.app_role,
      NULL
    );

  PERFORM pg_temp.sec02_assert_raises(
    pg_catalog.format(
      'SELECT pg_temp.sec02_insert_auth_user(%L::uuid, %L, %L::jsonb)',
      v_user_id,
      'sec02-other@example.test',
      pg_catalog.jsonb_build_object(
        'registration_invite_token',
        v_result.token
      )::text
    ),
    'P0001',
    'an invitation must reject a different email'
  );
END;
$test$;

-- Presence of the invitation key always selects the invitation branch. Empty
-- and unknown tokens must fail closed even when metadata contains a legacy
-- administrative legajo that would otherwise map to admin.
DO $test$
DECLARE
  v_empty_user_id uuid := pg_catalog.gen_random_uuid();
  v_invalid_user_id uuid := pg_catalog.gen_random_uuid();
  v_legacy_personal_id uuid := (
    SELECT value::uuid
      FROM sec02_test_state
     WHERE key = 'personal_legacy_admin'
  );
  v_legacy_legajo text;
  v_unknown_token text := pg_catalog.repeat('0', 64);
BEGIN
  SELECT legajo
    INTO v_legacy_legajo
    FROM public.personal
   WHERE id = v_legacy_personal_id;

  PERFORM pg_temp.sec02_assert(
    NOT EXISTS (
      SELECT 1
        FROM public.registration_invitations
       WHERE token_hash = extensions.digest(v_unknown_token, 'sha256')
    ),
    'the invalid-token fixture must not match an invitation'
  );

  PERFORM pg_temp.sec02_assert_raises(
    pg_catalog.format(
      'SELECT pg_temp.sec02_insert_auth_user(%L::uuid, %L, %L::jsonb)',
      v_empty_user_id,
      'sec02-empty-token@example.test',
      pg_catalog.jsonb_build_object(
        'registration_invite_token', '',
        'legajo', v_legacy_legajo,
        'nombre_completo', 'Must Not Reach Legacy'
      )::text
    ),
    'P0001',
    'an empty invitation token must not fall back to legacy'
  );

  PERFORM pg_temp.sec02_assert_raises(
    pg_catalog.format(
      'SELECT pg_temp.sec02_insert_auth_user(%L::uuid, %L, %L::jsonb)',
      v_invalid_user_id,
      'sec02-invalid-token@example.test',
      pg_catalog.jsonb_build_object(
        'registration_invite_token', v_unknown_token,
        'legajo', v_legacy_legajo,
        'nombre_completo', 'Must Not Reach Legacy'
      )::text
    ),
    'P0001',
    'an unknown invitation token must not fall back to legacy'
  );

  PERFORM pg_temp.sec02_assert(
    NOT EXISTS (
      SELECT 1 FROM auth.users
       WHERE id IN (v_empty_user_id, v_invalid_user_id)
    )
      AND NOT EXISTS (
        SELECT 1 FROM public.profiles
         WHERE user_id IN (v_empty_user_id, v_invalid_user_id)
      )
      AND NOT EXISTS (
        SELECT 1 FROM public.user_roles
         WHERE user_id IN (v_empty_user_id, v_invalid_user_id)
      )
      AND EXISTS (
        SELECT 1 FROM public.personal
         WHERE id = v_legacy_personal_id
           AND user_id IS NULL
      ),
    'invalid invitation tokens must leave no legacy or partial side effects'
  );
END;
$test$;

-- Consume a contador invitation, verify metadata cleanup, and prove the used
-- token cannot be reused even if a privileged test changes its bound email.
DO $test$
DECLARE
  v_result record;
  v_user_id uuid := pg_catalog.gen_random_uuid();
  v_reuse_user_id uuid := pg_catalog.gen_random_uuid();
BEGIN
  SELECT * INTO v_result
    FROM public.admin_create_registration_invitation(
      'sec02-used@example.test',
      'Used Contador',
      'contador'::public.app_role,
      NULL
    );

  PERFORM pg_temp.sec02_insert_auth_user(
    v_user_id,
    'SEC02-USED@example.test',
    pg_catalog.jsonb_build_object(
      'registration_invite_token', v_result.token,
      'legajo', 'ATTACKER-CONTROLLED'
    )
  );

  PERFORM pg_temp.sec02_assert(
    EXISTS (
      SELECT 1 FROM public.registration_invitations
       WHERE id = v_result.invitation_id
         AND used_by = v_user_id
         AND used_at IS NOT NULL
    ),
    'successful signup must consume the invitation'
  );
  PERFORM pg_temp.sec02_assert(
    EXISTS (
      SELECT 1 FROM public.user_roles
       WHERE user_id = v_user_id AND role = 'contador'::public.app_role
    )
      AND (
        SELECT pg_catalog.count(*) = 1
          FROM public.user_roles
         WHERE user_id = v_user_id
      ),
    'successful signup must assign exactly the invitation role'
  );
  PERFORM pg_temp.sec02_assert(
    NOT EXISTS (
      SELECT 1 FROM auth.users
       WHERE id = v_user_id
         AND raw_user_meta_data ? 'registration_invite_token'
    ),
    'the raw invitation token must be removed from auth metadata'
  );

  UPDATE public.registration_invitations
     SET email_normalized = 'sec02-reuse@example.test'
   WHERE id = v_result.invitation_id;

  PERFORM pg_temp.sec02_assert_raises(
    pg_catalog.format(
      'SELECT pg_temp.sec02_insert_auth_user(%L::uuid, %L, %L::jsonb)',
      v_reuse_user_id,
      'sec02-reuse@example.test',
      pg_catalog.jsonb_build_object(
        'registration_invite_token',
        v_result.token
      )::text
    ),
    'P0001',
    'a consumed token must not be reused'
  );
  PERFORM pg_temp.sec02_assert_raises(
    pg_catalog.format(
      'SELECT public.admin_revoke_registration_invitation(%L::uuid)',
      v_result.invitation_id
    ),
    '22023',
    'a consumed invitation must not be revoked'
  );

  INSERT INTO sec02_test_state (key, value)
  VALUES ('used_user_id', v_user_id::text);
END;
$test$;

-- An already-linked personal record cannot receive an invitation.
UPDATE public.personal
   SET user_id = (SELECT value::uuid FROM sec02_test_state WHERE key = 'used_user_id')
 WHERE id = (SELECT value::uuid FROM sec02_test_state WHERE key = 'personal_linked');

SELECT pg_temp.sec02_assert_raises(
  pg_catalog.format(
    $sql$
      SELECT * FROM public.admin_create_registration_invitation(
        'sec02-linked@example.test',
        'Already Linked',
        'maquinista'::public.app_role,
        %L::uuid
      )
    $sql$,
    (SELECT value FROM sec02_test_state WHERE key = 'personal_linked')
  ),
  '23505',
  'an already-linked personal record must be rejected'
);

-- Manipulated legacy metadata has no effect in the invitation branch. The
-- administrative legajo would map to admin in legacy. The invited personal is
-- classified as maquinista but deliberately receives the ayudante app role:
-- personal.rol and user_roles.role are separate concepts.
DO $test$
DECLARE
  v_result record;
  v_user_id uuid := pg_catalog.gen_random_uuid();
  v_attacker_legajo text;
BEGIN
  SELECT legajo INTO v_attacker_legajo
    FROM public.personal
   WHERE id = (
     SELECT value::uuid FROM sec02_test_state
      WHERE key = 'personal_legacy_admin'
   );

  SELECT * INTO v_result
    FROM public.admin_create_registration_invitation(
      'sec02-metadata@example.test',
      'Invitation Wins',
      'ayudante'::public.app_role,
      (
        SELECT value::uuid FROM sec02_test_state
         WHERE key = 'personal_manipulated'
      )
    );

  PERFORM pg_temp.sec02_insert_auth_user(
    v_user_id,
    'sec02-metadata@example.test',
    pg_catalog.jsonb_build_object(
      'registration_invite_token', v_result.token,
      'legajo', v_attacker_legajo,
      'rol', 'admin',
      'user_id', pg_catalog.gen_random_uuid()::text,
      'nombre_completo', 'Attacker Name'
    )
  );

  PERFORM pg_temp.sec02_assert(
    EXISTS (
      SELECT 1 FROM public.user_roles
       WHERE user_id = v_user_id AND role = 'ayudante'::public.app_role
    )
      AND (
        SELECT pg_catalog.count(*) = 1
          FROM public.user_roles
         WHERE user_id = v_user_id
      ),
    'exactly the role stored in the invitation may be assigned'
  );
  PERFORM pg_temp.sec02_assert(
    EXISTS (
      SELECT 1 FROM public.profiles
       WHERE user_id = v_user_id AND nombre_completo = 'Invitation Wins'
    ),
    'invitation display_name must override untrusted metadata'
  );
  PERFORM pg_temp.sec02_assert(
    EXISTS (
      SELECT 1 FROM public.personal
       WHERE id = (
         SELECT value::uuid FROM sec02_test_state
          WHERE key = 'personal_manipulated'
        )
         AND user_id = v_user_id
         AND rol = 'maquinista'::public.rol_personal
    )
      AND EXISTS (
        SELECT 1 FROM public.personal
         WHERE id = (
           SELECT value::uuid FROM sec02_test_state
            WHERE key = 'personal_legacy_admin'
         )
           AND user_id IS NULL
      ),
    'personal classification must remain independent from the invitation role'
  );
END;
$test$;

-- Reissuing for one personal revokes the first token. Only the second token can
-- claim it, and no later invitation can target the linked record.
DO $test$
DECLARE
  v_first record;
  v_second record;
  v_first_user uuid := pg_catalog.gen_random_uuid();
  v_second_user uuid := pg_catalog.gen_random_uuid();
BEGIN
  SELECT * INTO v_first
    FROM public.admin_create_registration_invitation(
      'sec02-race-first@example.test',
      'Race First',
      'maquinista'::public.app_role,
      (SELECT value::uuid FROM sec02_test_state WHERE key = 'personal_race')
    );

  SELECT * INTO v_second
    FROM public.admin_create_registration_invitation(
      'sec02-race-second@example.test',
      'Race Second',
      'maquinista'::public.app_role,
      (SELECT value::uuid FROM sec02_test_state WHERE key = 'personal_race')
    );

  PERFORM pg_temp.sec02_assert(
    EXISTS (
      SELECT 1 FROM public.registration_invitations
       WHERE id = v_first.invitation_id AND revoked_at IS NOT NULL
    ),
    'reissuing for the same personal must revoke the previous invitation'
  );
  PERFORM pg_temp.sec02_assert_raises(
    pg_catalog.format(
      'SELECT pg_temp.sec02_insert_auth_user(%L::uuid, %L, %L::jsonb)',
      v_first_user,
      'sec02-race-first@example.test',
      pg_catalog.jsonb_build_object(
        'registration_invite_token',
        v_first.token
      )::text
    ),
    'P0001',
    'the superseded token must not claim the personal record'
  );

  PERFORM pg_temp.sec02_insert_auth_user(
    v_second_user,
    'sec02-race-second@example.test',
    pg_catalog.jsonb_build_object(
      'registration_invite_token',
      v_second.token
    )
  );

  PERFORM pg_temp.sec02_assert(
    EXISTS (
      SELECT 1 FROM public.personal
       WHERE id = (
         SELECT value::uuid FROM sec02_test_state WHERE key = 'personal_race'
       )
         AND user_id = v_second_user
    ),
    'exactly the valid consumer must own the personal record'
  );
  PERFORM pg_temp.sec02_assert_raises(
    pg_catalog.format(
      $sql$
        SELECT * FROM public.admin_create_registration_invitation(
          'sec02-race-third@example.test',
          'Race Third',
          'maquinista'::public.app_role,
          %L::uuid
        )
      $sql$,
      (SELECT value FROM sec02_test_state WHERE key = 'personal_race')
    ),
    '23505',
    'a linked personal record must reject every later invitation'
  );
END;
$test$;

-- Force a failure after profile/personal work has begun. The auth.users insert,
-- profile, link, role and invitation consumption must all roll back together.
CREATE OR REPLACE FUNCTION public.sec02_test_force_role_failure_20260930()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = pg_catalog
AS $function$
BEGIN
  IF NEW.user_id::text = pg_catalog.current_setting(
    'sec02.test_failure_user',
    true
  ) THEN
    RAISE EXCEPTION 'SEC-02 forced role failure' USING ERRCODE = 'P0001';
  END IF;
  RETURN NEW;
END;
$function$;

CREATE TRIGGER sec02_test_force_role_failure_20260930
BEFORE INSERT ON public.user_roles
FOR EACH ROW
EXECUTE FUNCTION public.sec02_test_force_role_failure_20260930();

DO $test$
DECLARE
  v_result record;
  v_user_id uuid := pg_catalog.gen_random_uuid();
  v_personal_id uuid := (
    SELECT value::uuid FROM sec02_test_state WHERE key = 'personal_atomic'
  );
BEGIN
  SELECT * INTO v_result
    FROM public.admin_create_registration_invitation(
      'sec02-atomic@example.test',
      'Atomic User',
      'maquinista'::public.app_role,
      v_personal_id
    );

  PERFORM pg_catalog.set_config(
    'sec02.test_failure_user',
    v_user_id::text,
    true
  );

  PERFORM pg_temp.sec02_assert_raises(
    pg_catalog.format(
      'SELECT pg_temp.sec02_insert_auth_user(%L::uuid, %L, %L::jsonb)',
      v_user_id,
      'sec02-atomic@example.test',
      pg_catalog.jsonb_build_object(
        'registration_invite_token',
        v_result.token
      )::text
    ),
    'P0001',
    'a downstream role failure must abort signup'
  );

  PERFORM pg_temp.sec02_assert(
    NOT EXISTS (SELECT 1 FROM auth.users WHERE id = v_user_id)
      AND NOT EXISTS (SELECT 1 FROM public.profiles WHERE user_id = v_user_id)
      AND EXISTS (
        SELECT 1 FROM public.personal
         WHERE id = v_personal_id AND user_id IS NULL
      )
      AND NOT EXISTS (
        SELECT 1 FROM public.user_roles WHERE user_id = v_user_id
      )
      AND EXISTS (
        SELECT 1 FROM public.registration_invitations
         WHERE id = v_result.invitation_id AND used_at IS NULL
      ),
    'trigger failure must leave no partial auth, profile, link, role or use state'
  );
END;
$test$;

DROP TRIGGER sec02_test_force_role_failure_20260930 ON public.user_roles;
DROP FUNCTION public.sec02_test_force_role_failure_20260930();

-- Absence of registration_invite_token still runs the existing legacy branch.
DO $test$
DECLARE
  v_user_id uuid := pg_catalog.gen_random_uuid();
  v_legajo text;
BEGIN
  SELECT legajo INTO v_legajo
    FROM public.personal
   WHERE id = (
     SELECT value::uuid FROM sec02_test_state WHERE key = 'personal_legacy'
   );

  PERFORM pg_temp.sec02_insert_auth_user(
    v_user_id,
    'sec02-legacy@example.test',
    pg_catalog.jsonb_build_object(
      'legajo', v_legajo,
      'nombre_completo', 'Legacy User'
    )
  );

  PERFORM pg_temp.sec02_assert(
    EXISTS (
      SELECT 1 FROM public.profiles
       WHERE user_id = v_user_id AND nombre_completo = 'Legacy User'
    )
      AND EXISTS (
        SELECT 1 FROM public.user_roles
         WHERE user_id = v_user_id AND role = 'capataz'::public.app_role
      ),
    'legacy signup must preserve its profile and role mapping behavior'
  );
END;
$test$;

ROLLBACK;
