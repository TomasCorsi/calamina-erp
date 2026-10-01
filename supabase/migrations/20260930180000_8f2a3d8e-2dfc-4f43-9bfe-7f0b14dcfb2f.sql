-- SEC-01: replace the enumerable public personal lookup with a minimal boolean RPC.

-- Defensive cleanup: this policy was already dropped by a historical migration.
DROP POLICY IF EXISTS "Allow public legajo lookup for registration" ON public.personal;

-- Remove only the anonymous role's direct read privilege. Authenticated grants and
-- all existing RLS policies remain unchanged.
REVOKE SELECT ON TABLE public.personal FROM anon;

-- The public SECURITY DEFINER view exposed id, legajo, rol and link status and
-- allowed bulk enumeration. No CASCADE: unexpected dependencies must stop deploy.
DROP VIEW IF EXISTS public.personal_legajo_lookup;

CREATE OR REPLACE FUNCTION public.is_personal_legajo_available(p_legajo text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog
AS $function$
  SELECT EXISTS (
    SELECT 1
    FROM public.personal AS p
    WHERE NULLIF(pg_catalog.btrim(p_legajo), '') IS NOT NULL
      AND p.legajo = pg_catalog.btrim(p_legajo)
      AND p.user_id IS NULL
  );
$function$;

REVOKE ALL ON FUNCTION public.is_personal_legajo_available(text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.is_personal_legajo_available(text) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.is_personal_legajo_available(text) TO anon;

COMMENT ON FUNCTION public.is_personal_legajo_available(text) IS
  'Returns only whether a legajo exists and is not linked; exposes no personal fields.';
