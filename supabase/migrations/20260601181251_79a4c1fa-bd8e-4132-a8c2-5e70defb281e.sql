DROP VIEW IF EXISTS public.personal_selector;

CREATE VIEW public.personal_selector
WITH (security_invoker = false) AS
SELECT id, nombre, apellido, rol, activo, legajo, user_id
FROM public.personal;

REVOKE ALL ON public.personal_selector FROM PUBLIC;
REVOKE ALL ON public.personal_selector FROM anon;
GRANT SELECT ON public.personal_selector TO authenticated;