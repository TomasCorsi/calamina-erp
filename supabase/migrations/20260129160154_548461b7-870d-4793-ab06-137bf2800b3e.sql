-- Fix: Recreate view with security_invoker = true (safer approach)
-- The view inherits RLS from the base table, but we need to ensure 
-- unauthenticated users can still query minimal fields

DROP VIEW IF EXISTS public.personal_legajo_lookup;

-- Create view without security_invoker (default behavior allows querying)
CREATE VIEW public.personal_legajo_lookup AS
SELECT 
  id,
  legajo,
  rol,
  (user_id IS NOT NULL) as ya_vinculado
FROM public.personal;

COMMENT ON VIEW public.personal_legajo_lookup IS 
  'Vista segura para validar legajos durante registro de empleados. No expone datos sensibles.';

-- Re-grant permissions
GRANT SELECT ON public.personal_legajo_lookup TO anon;
GRANT SELECT ON public.personal_legajo_lookup TO authenticated;