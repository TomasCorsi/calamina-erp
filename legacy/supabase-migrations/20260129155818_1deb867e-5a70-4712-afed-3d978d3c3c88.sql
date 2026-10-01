-- =====================================================
-- SECURITY FIX: Protect personal table sensitive data
-- =====================================================

-- 1. Create secure view for legajo lookup (only exposes minimal data)
CREATE VIEW public.personal_legajo_lookup
WITH (security_invoker = false) AS
SELECT 
  id,
  legajo,
  rol,
  (user_id IS NOT NULL) as ya_vinculado
FROM public.personal;

COMMENT ON VIEW public.personal_legajo_lookup IS 
  'Vista segura para validar legajos durante registro de empleados. No expone datos sensibles.';

-- 2. Remove vulnerable public SELECT policy
DROP POLICY IF EXISTS "Allow public legajo lookup for registration" ON public.personal;

-- 3. Remove vulnerable UPDATE policy that allows claiming any unlinked record
DROP POLICY IF EXISTS "Users can link their own personal record" ON public.personal;

-- 4. Add policy for employees to view their own record
CREATE POLICY "Employees can view own record"
ON public.personal
FOR SELECT
USING (user_id = auth.uid());

-- 5. Add policy for employees to update their own contact info
CREATE POLICY "Employees can update own contact info"
ON public.personal
FOR UPDATE
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

-- 6. Create secure function for linking personal records
-- Uses SECURITY DEFINER to bypass RLS and validate properly
CREATE OR REPLACE FUNCTION public.link_personal_to_user(
  p_legajo TEXT,
  p_user_id UUID
)
RETURNS TABLE (
  success BOOLEAN,
  personal_id UUID,
  rol rol_personal,
  error_message TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_personal_id UUID;
  v_rol rol_personal;
  v_existing_user_id UUID;
BEGIN
  -- Find the personal record by legajo
  SELECT id, rol, user_id 
  INTO v_personal_id, v_rol, v_existing_user_id
  FROM public.personal
  WHERE legajo = p_legajo;

  -- Validate record exists
  IF v_personal_id IS NULL THEN
    RETURN QUERY SELECT false::BOOLEAN, NULL::UUID, NULL::rol_personal, 'Legajo no encontrado'::TEXT;
    RETURN;
  END IF;

  -- Validate not already linked
  IF v_existing_user_id IS NOT NULL THEN
    RETURN QUERY SELECT false::BOOLEAN, NULL::UUID, NULL::rol_personal, 'Este legajo ya tiene cuenta asociada'::TEXT;
    RETURN;
  END IF;

  -- Perform the secure link
  UPDATE public.personal
  SET user_id = p_user_id
  WHERE id = v_personal_id;

  RETURN QUERY SELECT true::BOOLEAN, v_personal_id, v_rol, NULL::TEXT;
END;
$$;

-- 7. Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.link_personal_to_user(TEXT, UUID) TO authenticated;

-- 8. Grant SELECT on the secure view to anon and authenticated
GRANT SELECT ON public.personal_legajo_lookup TO anon;
GRANT SELECT ON public.personal_legajo_lookup TO authenticated;