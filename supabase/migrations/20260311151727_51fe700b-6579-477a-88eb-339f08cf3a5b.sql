CREATE OR REPLACE FUNCTION public.is_personal_mecanico(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.personal
    WHERE user_id = _user_id
      AND rol IN ('mecanico', 'ayudante')
  )
$$;