-- Drop the existing restrictive policy and create a better one
DROP POLICY IF EXISTS "Admins and capataces can manage personal" ON public.personal;

-- Create separate policies for read and write operations

-- Read policy: Allow admins, capataces (by user_roles), and capataces (by personal.rol) to view all personal
CREATE POLICY "Admins and capataces can view all personal"
ON public.personal
FOR SELECT
USING (
  has_role(auth.uid(), 'admin'::app_role) 
  OR has_role(auth.uid(), 'capataz'::app_role)
  OR EXISTS (
    SELECT 1 FROM public.personal p 
    WHERE p.user_id = auth.uid() 
    AND p.rol = 'capataz'
  )
);

-- Write policy: Only admins can modify personal records (except employees updating their own)
CREATE POLICY "Admins can manage personal"
ON public.personal
FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));