-- SEC-02 EXPAND: add one-time registration invitations while preserving the
-- existing legajo-based registration flow unchanged.

CREATE SCHEMA IF NOT EXISTS extensions;
CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA extensions;

DO $pgcrypto_check$
BEGIN
  IF pg_catalog.to_regprocedure('extensions.gen_random_bytes(integer)') IS NULL
     OR pg_catalog.to_regprocedure('extensions.digest(text,text)') IS NULL THEN
    RAISE EXCEPTION
      'SEC-02 EXPAND requires pgcrypto functions in the extensions schema';
  END IF;
END;
$pgcrypto_check$;

CREATE TABLE public.registration_invitations (
  id uuid PRIMARY KEY DEFAULT pg_catalog.gen_random_uuid(),
  token_hash bytea NOT NULL UNIQUE,
  email_normalized text NOT NULL,
  display_name text NOT NULL,
  personal_id uuid REFERENCES public.personal(id) ON DELETE RESTRICT,
  role public.app_role NOT NULL,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT pg_catalog.now(),
  expires_at timestamptz NOT NULL,
  used_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  used_at timestamptz,
  revoked_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  revoked_at timestamptz,

  CONSTRAINT registration_invitations_token_hash_length
    CHECK (pg_catalog.octet_length(token_hash) = 32),
  CONSTRAINT registration_invitations_email_normalized
    CHECK (
      email_normalized = pg_catalog.lower(pg_catalog.btrim(email_normalized))
      AND email_normalized <> ''
      AND pg_catalog.char_length(email_normalized) <= 320
    ),
  CONSTRAINT registration_invitations_display_name_normalized
    CHECK (
      display_name = pg_catalog.btrim(display_name)
      AND display_name <> ''
    ),
  CONSTRAINT registration_invitations_expires_after_creation
    CHECK (expires_at > created_at),
  CONSTRAINT registration_invitations_used_actor_requires_timestamp
    CHECK (used_by IS NULL OR used_at IS NOT NULL),
  CONSTRAINT registration_invitations_revoked_actor_requires_timestamp
    CHECK (revoked_by IS NULL OR revoked_at IS NOT NULL),
  CONSTRAINT registration_invitations_terminal_state
    CHECK (NOT (used_at IS NOT NULL AND revoked_at IS NOT NULL)),
  CONSTRAINT registration_invitations_used_after_creation
    CHECK (used_at IS NULL OR used_at >= created_at),
  CONSTRAINT registration_invitations_revoked_after_creation
    CHECK (revoked_at IS NULL OR revoked_at >= created_at),
  CONSTRAINT registration_invitations_no_admin
    CHECK (role <> 'admin'::public.app_role),
  CONSTRAINT registration_invitations_personal_required
    CHECK (role = 'contador'::public.app_role OR personal_id IS NOT NULL)
);

CREATE UNIQUE INDEX registration_invitations_pending_email_unique
  ON public.registration_invitations (email_normalized)
  WHERE used_at IS NULL AND revoked_at IS NULL;

CREATE UNIQUE INDEX registration_invitations_pending_personal_unique
  ON public.registration_invitations (personal_id)
  WHERE personal_id IS NOT NULL AND used_at IS NULL AND revoked_at IS NULL;

CREATE INDEX registration_invitations_pending_expiry_idx
  ON public.registration_invitations (expires_at)
  WHERE used_at IS NULL AND revoked_at IS NULL;

ALTER TABLE public.registration_invitations ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public.registration_invitations FROM PUBLIC;
REVOKE ALL ON TABLE public.registration_invitations FROM anon;
REVOKE ALL ON TABLE public.registration_invitations FROM authenticated;

COMMENT ON TABLE public.registration_invitations IS
  'One-time registration invitations. Raw tokens are never persisted.';
COMMENT ON COLUMN public.registration_invitations.token_hash IS
  'SHA-256 digest of a 32-byte random token; never expose through frontend APIs.';

CREATE OR REPLACE FUNCTION public.admin_create_registration_invitation(
  p_email text,
  p_display_name text,
  p_role public.app_role,
  p_personal_id uuid DEFAULT NULL
)
RETURNS TABLE (
  invitation_id uuid,
  token text,
  expires_at timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog
AS $function$
DECLARE
  v_actor uuid := auth.uid();
  v_email text;
  v_display_name text;
  v_token text;
  v_token_hash bytea;
  v_invitation_id uuid;
  v_created_at timestamptz := pg_catalog.now();
  v_expires_at timestamptz;
  v_personal_user_id uuid;
  v_personal_activo boolean;
BEGIN
  IF v_actor IS NULL THEN
    RAISE EXCEPTION 'Authentication required' USING ERRCODE = '42501';
  END IF;

  IF NOT EXISTS (
    SELECT 1
      FROM public.user_roles AS ur
     WHERE ur.user_id = v_actor
       AND ur.role = 'admin'::public.app_role
  ) THEN
    RAISE EXCEPTION 'Administrator role required' USING ERRCODE = '42501';
  END IF;

  IF p_role IS NULL THEN
    RAISE EXCEPTION 'Role is required' USING ERRCODE = '22023';
  END IF;

  IF p_role = 'admin'::public.app_role THEN
    RAISE EXCEPTION 'Admin invitations are not allowed' USING ERRCODE = '22023';
  END IF;

  v_email := pg_catalog.lower(pg_catalog.btrim(COALESCE(p_email, '')));
  v_display_name := pg_catalog.btrim(COALESCE(p_display_name, ''));

  IF v_email = ''
     OR pg_catalog.char_length(v_email) > 320
     OR pg_catalog.strpos(v_email, '@') <= 1
     OR pg_catalog.strpos(v_email, '@') = pg_catalog.char_length(v_email) THEN
    RAISE EXCEPTION 'A valid email is required' USING ERRCODE = '22023';
  END IF;

  IF v_display_name = '' THEN
    RAISE EXCEPTION 'Display name is required' USING ERRCODE = '22023';
  END IF;

  IF p_role <> 'contador'::public.app_role AND p_personal_id IS NULL THEN
    RAISE EXCEPTION 'This role requires a personal record' USING ERRCODE = '22023';
  END IF;

  -- Serialize invitation replacement for the same normalized email.
  PERFORM pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended('registration-invitation-email:' || v_email, 0)
  );

  IF p_personal_id IS NOT NULL THEN
    -- Serialize reissues for the same personal without taking its row lock
    -- before invitation rows. The trigger uses invitation -> personal order.
    PERFORM pg_catalog.pg_advisory_xact_lock(
      pg_catalog.hashtextextended(
        'registration-invitation-personal:' || p_personal_id::text,
        0
      )
    );
  END IF;

  -- Lock every conflicting invitation in a deterministic order. Keeping the
  -- same invitation -> personal order as handle_new_user avoids deadlocks with
  -- a concurrent signup.
  PERFORM 1
    FROM public.registration_invitations AS ri
   WHERE ri.used_at IS NULL
     AND ri.revoked_at IS NULL
     AND (
       ri.email_normalized = v_email
       OR (p_personal_id IS NOT NULL AND ri.personal_id = p_personal_id)
     )
   ORDER BY ri.id
   FOR UPDATE;

  -- Reissuing an invitation invalidates unresolved invitations for the same
  -- email or personal record, including invitations that have merely expired.
  UPDATE public.registration_invitations AS ri
     SET revoked_by = v_actor,
         revoked_at = v_created_at
   WHERE ri.used_at IS NULL
     AND ri.revoked_at IS NULL
     AND (
       ri.email_normalized = v_email
       OR (p_personal_id IS NOT NULL AND ri.personal_id = p_personal_id)
     );

  IF p_personal_id IS NOT NULL THEN
    SELECT p.user_id, p.activo
      INTO v_personal_user_id, v_personal_activo
      FROM public.personal AS p
     WHERE p.id = p_personal_id
     FOR UPDATE;

    IF NOT FOUND THEN
      RAISE EXCEPTION 'Personal record not found' USING ERRCODE = '22023';
    END IF;

    IF v_personal_user_id IS NOT NULL THEN
      RAISE EXCEPTION 'Personal record is already linked' USING ERRCODE = '23505';
    END IF;

    IF v_personal_activo IS NOT TRUE THEN
      RAISE EXCEPTION 'Personal record is inactive' USING ERRCODE = '22023';
    END IF;
  END IF;

  v_token := pg_catalog.encode(extensions.gen_random_bytes(32), 'hex');
  v_token_hash := extensions.digest(v_token, 'sha256');
  v_expires_at := v_created_at + pg_catalog.make_interval(hours => 72);

  INSERT INTO public.registration_invitations (
    token_hash,
    email_normalized,
    display_name,
    personal_id,
    role,
    created_by,
    created_at,
    expires_at
  )
  VALUES (
    v_token_hash,
    v_email,
    v_display_name,
    p_personal_id,
    p_role,
    v_actor,
    v_created_at,
    v_expires_at
  )
  RETURNING id INTO v_invitation_id;

  RETURN QUERY
  SELECT v_invitation_id, v_token, v_expires_at;
END;
$function$;

CREATE OR REPLACE FUNCTION public.admin_revoke_registration_invitation(
  p_invitation_id uuid
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog
AS $function$
DECLARE
  v_actor uuid := auth.uid();
  v_used_at timestamptz;
  v_revoked_at timestamptz;
BEGIN
  IF v_actor IS NULL THEN
    RAISE EXCEPTION 'Authentication required' USING ERRCODE = '42501';
  END IF;

  IF NOT EXISTS (
    SELECT 1
      FROM public.user_roles AS ur
     WHERE ur.user_id = v_actor
       AND ur.role = 'admin'::public.app_role
  ) THEN
    RAISE EXCEPTION 'Administrator role required' USING ERRCODE = '42501';
  END IF;

  IF p_invitation_id IS NULL THEN
    RAISE EXCEPTION 'Invitation id is required' USING ERRCODE = '22023';
  END IF;

  SELECT ri.used_at, ri.revoked_at
    INTO v_used_at, v_revoked_at
    FROM public.registration_invitations AS ri
   WHERE ri.id = p_invitation_id
   FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Invitation not found' USING ERRCODE = '22023';
  END IF;

  IF v_used_at IS NOT NULL THEN
    RAISE EXCEPTION 'A consumed invitation cannot be revoked' USING ERRCODE = '22023';
  END IF;

  IF v_revoked_at IS NOT NULL THEN
    RETURN true;
  END IF;

  UPDATE public.registration_invitations AS ri
     SET revoked_by = v_actor,
         revoked_at = pg_catalog.now()
   WHERE ri.id = p_invitation_id;

  RETURN true;
END;
$function$;

REVOKE ALL ON FUNCTION public.admin_create_registration_invitation(
  text, text, public.app_role, uuid
) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.admin_create_registration_invitation(
  text, text, public.app_role, uuid
) FROM anon;
GRANT EXECUTE ON FUNCTION public.admin_create_registration_invitation(
  text, text, public.app_role, uuid
) TO authenticated;

REVOKE ALL ON FUNCTION public.admin_revoke_registration_invitation(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.admin_revoke_registration_invitation(uuid) FROM anon;
GRANT EXECUTE ON FUNCTION public.admin_revoke_registration_invitation(uuid) TO authenticated;

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog
AS $function$
DECLARE
  -- Invitation branch variables.
  v_invite_token text;
  v_invitation_id uuid;
  v_invitation_email text;
  v_invitation_display_name text;
  v_invitation_personal_id uuid;
  v_invitation_role public.app_role;
  v_invitation_expires_at timestamptz;
  v_invitation_used_at timestamptz;
  v_invitation_revoked_at timestamptz;
  v_personal_user_id uuid;
  v_personal_activo boolean;
  v_affected_rows integer;

  -- Legacy branch variables. Their behavior is intentionally unchanged.
  v_legajo text;
  v_rol public.rol_personal;
  v_app_role public.app_role := 'maquinista'::public.app_role;
BEGIN
  IF COALESCE(NEW.raw_user_meta_data, '{}'::jsonb)
       ? 'registration_invite_token' THEN
    v_invite_token := NULLIF(
      pg_catalog.btrim(
        COALESCE(
          NEW.raw_user_meta_data->>'registration_invite_token',
          ''
        )
      ),
      ''
    );

    IF v_invite_token IS NULL
       OR v_invite_token !~ '^[0-9a-f]{64}$' THEN
      RAISE EXCEPTION 'Invalid or unavailable registration invitation'
        USING ERRCODE = 'P0001';
    END IF;

    SELECT
      ri.id,
      ri.email_normalized,
      ri.display_name,
      ri.personal_id,
      ri.role,
      ri.expires_at,
      ri.used_at,
      ri.revoked_at
    INTO
      v_invitation_id,
      v_invitation_email,
      v_invitation_display_name,
      v_invitation_personal_id,
      v_invitation_role,
      v_invitation_expires_at,
      v_invitation_used_at,
      v_invitation_revoked_at
    FROM public.registration_invitations AS ri
    WHERE ri.token_hash = extensions.digest(v_invite_token, 'sha256')
    FOR UPDATE;

    IF NOT FOUND
       OR v_invitation_used_at IS NOT NULL
       OR v_invitation_revoked_at IS NOT NULL
       OR v_invitation_expires_at <= pg_catalog.now()
       OR v_invitation_role = 'admin'::public.app_role
       OR v_invitation_email <>
          pg_catalog.lower(pg_catalog.btrim(COALESCE(NEW.email, '')))
       OR (
         v_invitation_role <> 'contador'::public.app_role
         AND v_invitation_personal_id IS NULL
       ) THEN
      RAISE EXCEPTION 'Invalid or unavailable registration invitation'
        USING ERRCODE = 'P0001';
    END IF;

    IF v_invitation_personal_id IS NOT NULL THEN
      SELECT p.user_id, p.activo
        INTO v_personal_user_id, v_personal_activo
        FROM public.personal AS p
       WHERE p.id = v_invitation_personal_id
       FOR UPDATE;

      IF NOT FOUND
         OR v_personal_user_id IS NOT NULL
         OR v_personal_activo IS NOT TRUE THEN
        RAISE EXCEPTION 'Invalid or unavailable registration invitation'
          USING ERRCODE = 'P0001';
      END IF;
    END IF;

    INSERT INTO public.profiles (user_id, nombre_completo)
    VALUES (NEW.id, v_invitation_display_name);

    IF v_invitation_personal_id IS NOT NULL THEN
      UPDATE public.personal AS p
       SET user_id = NEW.id
       WHERE p.id = v_invitation_personal_id
         AND p.user_id IS NULL
         AND p.activo IS TRUE;

      GET DIAGNOSTICS v_affected_rows = ROW_COUNT;
      IF v_affected_rows <> 1 THEN
        RAISE EXCEPTION 'Invalid or unavailable registration invitation'
          USING ERRCODE = 'P0001';
      END IF;
    END IF;

    INSERT INTO public.user_roles (user_id, role)
    VALUES (NEW.id, v_invitation_role);

    UPDATE public.registration_invitations AS ri
       SET used_by = NEW.id,
           used_at = pg_catalog.now()
     WHERE ri.id = v_invitation_id
       AND ri.used_at IS NULL
       AND ri.revoked_at IS NULL;

    GET DIAGNOSTICS v_affected_rows = ROW_COUNT;
    IF v_affected_rows <> 1 THEN
      RAISE EXCEPTION 'Invalid or unavailable registration invitation'
        USING ERRCODE = 'P0001';
    END IF;

    -- handle_new_user is an AFTER INSERT trigger, so changing NEW would not
    -- persist. Remove the one-time secret with an update in the same transaction.
    UPDATE auth.users AS u
       SET raw_user_meta_data =
         COALESCE(u.raw_user_meta_data, '{}'::jsonb)
         - 'registration_invite_token'
     WHERE u.id = NEW.id;

    GET DIAGNOSTICS v_affected_rows = ROW_COUNT;
    IF v_affected_rows <> 1 THEN
      RAISE EXCEPTION 'Could not clear registration invitation metadata'
        USING ERRCODE = 'P0001';
    END IF;

    RETURN NEW;
  END IF;

  -- Legacy flow: retained verbatim in behavior for the EXPAND release.
  v_legajo := NULLIF(
    pg_catalog.btrim(
      COALESCE(NEW.raw_user_meta_data->>'legajo', '')
    ),
    ''
  );

  IF v_legajo IS NOT NULL THEN
    SELECT p.rol
      INTO v_rol
      FROM public.personal AS p
     WHERE p.legajo = v_legajo
     LIMIT 1;

    IF v_rol IS NOT NULL THEN
      v_app_role := public.map_personal_rol_to_app_role(v_rol);
    END IF;
  END IF;

  INSERT INTO public.profiles (user_id, nombre_completo)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'nombre_completo', NEW.email)
  )
  ON CONFLICT (user_id) DO NOTHING;

  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, v_app_role)
  ON CONFLICT (user_id, role) DO NOTHING;

  RETURN NEW;
END;
$function$;
