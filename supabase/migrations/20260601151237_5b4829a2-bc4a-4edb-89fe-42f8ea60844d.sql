
-- ============================================================================
-- 1) execute_readonly_query RPC for chat-reportes (respects RLS)
-- ============================================================================
CREATE OR REPLACE FUNCTION public.execute_readonly_query(query_sql text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY INVOKER
STABLE
SET search_path = public
AS $$
DECLARE
  v_sql text;
  v_normalized text;
  v_result jsonb;
  v_forbidden text;
BEGIN
  v_sql := btrim(query_sql);
  -- Strip trailing semicolons/whitespace
  v_sql := regexp_replace(v_sql, ';+\s*$', '');
  v_normalized := upper(v_sql);

  -- Must start with SELECT or WITH
  IF v_normalized !~ '^(SELECT|WITH)\s' THEN
    RAISE EXCEPTION 'Solo se permiten consultas SELECT';
  END IF;

  -- No multiple statements
  IF position(';' in v_sql) > 0 THEN
    RAISE EXCEPTION 'No se permiten múltiples sentencias';
  END IF;

  -- Block forbidden tokens (case-insensitive whole-word)
  FOREACH v_forbidden IN ARRAY ARRAY[
    'INSERT','UPDATE','DELETE','DROP','ALTER','TRUNCATE','CREATE','GRANT','REVOKE',
    'COPY','VACUUM','ANALYZE','REINDEX','CLUSTER','LISTEN','NOTIFY','LOCK',
    'PG_READ_FILE','PG_READ_BINARY_FILE','PG_LS_DIR','PG_SLEEP','PG_TERMINATE_BACKEND',
    'PG_CANCEL_BACKEND','PG_STAT_FILE','LO_IMPORT','LO_EXPORT','DBLINK','PG_EXECUTE_SERVER_PROGRAM'
  ] LOOP
    IF v_normalized ~ ('\m' || v_forbidden || '\M') THEN
      RAISE EXCEPTION 'Token no permitido en la consulta: %', v_forbidden;
    END IF;
  END LOOP;

  -- Force LIMIT 100 if not present
  IF v_normalized !~ '\mLIMIT\M' THEN
    v_sql := v_sql || ' LIMIT 100';
  END IF;

  EXECUTE format('SELECT COALESCE(jsonb_agg(t), ''[]''::jsonb) FROM (%s) t', v_sql) INTO v_result;
  RETURN v_result;
END;
$$;

REVOKE ALL ON FUNCTION public.execute_readonly_query(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.execute_readonly_query(text) TO authenticated;

-- ============================================================================
-- 2) personal_selector: remove anon access, switch to security_invoker
-- ============================================================================
DROP VIEW IF EXISTS public.personal_selector;
CREATE VIEW public.personal_selector
WITH (security_invoker = true)
AS SELECT id, nombre, apellido, rol, activo, legajo, user_id FROM public.personal;

REVOKE ALL ON public.personal_selector FROM anon, PUBLIC;
GRANT SELECT ON public.personal_selector TO authenticated;

-- ============================================================================
-- 3) personal: drop is_personal_capataz() from policy, align to user_roles
-- ============================================================================
DROP POLICY IF EXISTS "Admins and capataces can view all personal" ON public.personal;
CREATE POLICY "Admins and capataces can view all personal"
ON public.personal
FOR SELECT
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'capataz'::app_role));

-- ============================================================================
-- 4) sueldos: admin only
-- ============================================================================
DROP POLICY IF EXISTS "Admins and capataces can manage sueldos" ON public.sueldos;
DROP POLICY IF EXISTS "Admins can manage sueldos" ON public.sueldos;
CREATE POLICY "Admins can manage sueldos"
ON public.sueldos
FOR ALL
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- ============================================================================
-- 5) remitos: drop hardcoded UUID policies, ensure Sergio has remitero role
-- ============================================================================
DROP POLICY IF EXISTS "Franco can manage own remitos" ON public.remitos;
DROP POLICY IF EXISTS "Sergio can manage own remitos" ON public.remitos;

-- Add remitero role for Sergio (idempotent)
INSERT INTO public.user_roles (user_id, role)
VALUES ('c92028bd-dd42-416d-8892-f00b5ef90f8f', 'remitero'::app_role)
ON CONFLICT (user_id, role) DO NOTHING;

-- ============================================================================
-- 6) clientes & proveedores: scope policies to authenticated
-- ============================================================================
DROP POLICY IF EXISTS "Admins and capataces can manage clientes" ON public.clientes;
CREATE POLICY "Admins and capataces can manage clientes"
ON public.clientes FOR ALL TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'capataz'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'capataz'::app_role));

DROP POLICY IF EXISTS "Maquinistas can view clientes" ON public.clientes;
CREATE POLICY "Maquinistas can view clientes"
ON public.clientes FOR SELECT TO authenticated
USING (has_role(auth.uid(), 'maquinista'::app_role));

DROP POLICY IF EXISTS "Admins and capataces can manage proveedores" ON public.proveedores;
CREATE POLICY "Admins and capataces can manage proveedores"
ON public.proveedores FOR ALL TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'capataz'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'capataz'::app_role));

DROP POLICY IF EXISTS "Maquinistas can view proveedores" ON public.proveedores;
CREATE POLICY "Maquinistas can view proveedores"
ON public.proveedores FOR SELECT TO authenticated
USING (has_role(auth.uid(), 'maquinista'::app_role));
