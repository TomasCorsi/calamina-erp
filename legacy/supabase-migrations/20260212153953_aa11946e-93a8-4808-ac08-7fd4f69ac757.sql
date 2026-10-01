DROP VIEW IF EXISTS public.personal_legajo_lookup;

CREATE VIEW public.personal_legajo_lookup
WITH (security_invoker = off) AS
SELECT 
  id,
  legajo,
  rol,
  (user_id IS NOT NULL) AS ya_vinculado
FROM public.personal;

GRANT SELECT ON public.personal_legajo_lookup TO anon;
GRANT SELECT ON public.personal_legajo_lookup TO authenticated;