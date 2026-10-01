
-- 1. Create secure view exposing only non-sensitive fields for selectors
CREATE OR REPLACE VIEW public.personal_selector AS
SELECT id, nombre, apellido, rol, activo, legajo, user_id
FROM public.personal;

-- 2. Grant access to authenticated users only
GRANT SELECT ON public.personal_selector TO authenticated;

-- 3. Remove the overly permissive policy that exposes ALL columns to ANY authenticated user
DROP POLICY IF EXISTS "Authenticated users can view personal for selectors" ON public.personal;
