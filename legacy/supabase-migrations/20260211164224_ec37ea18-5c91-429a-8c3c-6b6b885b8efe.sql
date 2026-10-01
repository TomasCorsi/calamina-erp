-- Change personal_selector to security_definer so all authenticated users
-- can read non-sensitive fields regardless of personal table RLS
CREATE OR REPLACE VIEW public.personal_selector
WITH (security_invoker = false)
AS SELECT id, nombre, apellido, rol, activo, legajo, user_id FROM public.personal;

-- Grant access to authenticated users
GRANT SELECT ON public.personal_selector TO authenticated;
GRANT SELECT ON public.personal_selector TO anon;