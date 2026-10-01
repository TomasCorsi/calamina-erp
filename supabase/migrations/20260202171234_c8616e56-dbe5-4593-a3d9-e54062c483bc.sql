-- Create a security definer function to check if user is capataz by personal record
CREATE OR REPLACE FUNCTION public.is_personal_capataz(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.personal
    WHERE user_id = _user_id
      AND rol = 'capataz'
  )
$$;

-- Drop the problematic policies
DROP POLICY IF EXISTS "Admins and capataces can view all personal" ON public.personal;
DROP POLICY IF EXISTS "Admins can manage personal" ON public.personal;

-- Create proper policies without recursive queries

-- SELECT policy for admins and capataces (both app_role and personal.rol)
CREATE POLICY "Admins and capataces can view all personal"
ON public.personal
FOR SELECT
USING (
  has_role(auth.uid(), 'admin'::app_role) 
  OR has_role(auth.uid(), 'capataz'::app_role)
  OR is_personal_capataz(auth.uid())
);

-- Full management for admins only
CREATE POLICY "Admins can manage personal"
ON public.personal
FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));