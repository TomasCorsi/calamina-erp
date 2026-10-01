
-- Fix personal_selector to use security_invoker (default for views, but be explicit)
CREATE OR REPLACE VIEW public.personal_selector
WITH (security_invoker = true)
AS
SELECT id, nombre, apellido, rol, activo, legajo, user_id
FROM public.personal;

-- Fix personal_legajo_lookup similarly
CREATE OR REPLACE VIEW public.personal_legajo_lookup
WITH (security_invoker = true)
AS
SELECT id, legajo, rol, (user_id IS NOT NULL) AS ya_vinculado
FROM public.personal;
