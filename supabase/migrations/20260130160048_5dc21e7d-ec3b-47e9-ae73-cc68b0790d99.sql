-- =====================================================
-- SECURITY FIX: Restrict vacaciones table access
-- =====================================================

-- Drop the overly permissive policy that allows all authenticated users to read all vacations
DROP POLICY IF EXISTS "Allow authenticated read vacaciones" ON public.vacaciones;

-- Create policy: Employees can view only their own vacation records
CREATE POLICY "Employees can view own vacaciones"
ON public.vacaciones
FOR SELECT
USING (
  personal_id IN (
    SELECT id FROM public.personal WHERE user_id = auth.uid()
  )
);

-- Create policy: Admins and capataces can view all vacation records
CREATE POLICY "Admins capataces view all vacaciones"
ON public.vacaciones
FOR SELECT
USING (
  has_role(auth.uid(), 'admin'::app_role) OR 
  has_role(auth.uid(), 'capataz'::app_role)
);

-- =====================================================
-- SECURITY FIX: Ensure personal table has proper protection
-- The existing policies are good, but we need to verify employees
-- without user_id linkage cannot be queried by random users
-- =====================================================

-- The current RLS policies on personal are:
-- 1. "Admins and capataces can manage personal" - ALL for admin/capataz ✓
-- 2. "Employees can update own contact info" - UPDATE where user_id = auth.uid() ✓
-- 3. "Employees can view own record" - SELECT where user_id = auth.uid() ✓

-- These policies are correct - employees without a linked user_id will NOT be 
-- accessible to random authenticated users because:
-- - Policy #3 checks user_id = auth.uid(), which will be NULL for unlinked employees
-- - NULL = UUID will always be false, so unlinked records are protected

-- No changes needed to personal table RLS policies.