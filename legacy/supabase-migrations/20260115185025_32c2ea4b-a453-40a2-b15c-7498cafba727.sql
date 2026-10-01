-- Drop existing policies on vacaciones
DROP POLICY IF EXISTS "Admins and capataces can manage vacaciones" ON public.vacaciones;
DROP POLICY IF EXISTS "Maquinistas can view vacaciones" ON public.vacaciones;

-- Create simpler, direct RLS policies
CREATE POLICY "Allow authenticated read vacaciones"
ON public.vacaciones
FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Allow admin capataz manage vacaciones"
ON public.vacaciones
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid()
    AND role IN ('admin'::app_role, 'capataz'::app_role)
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid()
    AND role IN ('admin'::app_role, 'capataz'::app_role)
  )
);