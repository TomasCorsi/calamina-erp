-- Add policy to allow all authenticated users to view basic personal info for form selectors
-- This is needed for features like the fuel load form where operators need to be selected

CREATE POLICY "Authenticated users can view personal for selectors"
ON public.personal
FOR SELECT
USING (auth.uid() IS NOT NULL);