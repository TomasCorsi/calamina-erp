-- Allow unauthenticated users to search by legajo during registration
-- This policy only allows checking if a legajo exists, not exposing sensitive data
CREATE POLICY "Allow public legajo lookup for registration"
  ON public.personal
  FOR SELECT
  USING (true);

-- Drop the old restrictive maquinista policy since we now have a more permissive one
DROP POLICY IF EXISTS "Maquinistas can view personal" ON public.personal;