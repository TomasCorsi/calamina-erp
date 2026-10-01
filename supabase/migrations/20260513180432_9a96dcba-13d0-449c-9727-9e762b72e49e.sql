-- Add forma_pago column to remitos
ALTER TABLE public.remitos
  ADD COLUMN IF NOT EXISTS forma_pago text;

ALTER TABLE public.remitos
  DROP CONSTRAINT IF EXISTS remitos_forma_pago_check;

ALTER TABLE public.remitos
  ADD CONSTRAINT remitos_forma_pago_check
  CHECK (forma_pago IS NULL OR forma_pago IN ('efectivo','transferencia','cuenta_corriente'));

-- Franco-only RLS policy: only sees/manages his own remitos
DROP POLICY IF EXISTS "Franco can manage own remitos" ON public.remitos;
CREATE POLICY "Franco can manage own remitos"
ON public.remitos
AS PERMISSIVE
FOR ALL
TO authenticated
USING ((auth.uid() = '2184b0ef-3c4f-4ca7-bdbf-c7cc69fc4c3a'::uuid) AND (created_by = auth.uid()))
WITH CHECK ((auth.uid() = '2184b0ef-3c4f-4ca7-bdbf-c7cc69fc4c3a'::uuid) AND (created_by = auth.uid()));

-- Replace the broad Remiteros policy so it excludes Franco (so Franco only matches his own-records policy)
DROP POLICY IF EXISTS "Remiteros can manage remitos" ON public.remitos;
CREATE POLICY "Remiteros can manage remitos"
ON public.remitos
AS PERMISSIVE
FOR ALL
TO authenticated
USING (has_role(auth.uid(), 'remitero'::app_role) AND auth.uid() <> '2184b0ef-3c4f-4ca7-bdbf-c7cc69fc4c3a'::uuid)
WITH CHECK (has_role(auth.uid(), 'remitero'::app_role) AND auth.uid() <> '2184b0ef-3c4f-4ca7-bdbf-c7cc69fc4c3a'::uuid);