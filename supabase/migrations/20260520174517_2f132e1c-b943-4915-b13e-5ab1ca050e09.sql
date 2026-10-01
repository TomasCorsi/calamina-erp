
DROP POLICY IF EXISTS "Remiteros can manage remitos" ON public.remitos;

CREATE POLICY "Remiteros can manage own remitos"
ON public.remitos
FOR ALL
TO authenticated
USING (
  has_role(auth.uid(), 'remitero'::app_role)
  AND auth.uid() <> '2184b0ef-3c4f-4ca7-bdbf-c7cc69fc4c3a'::uuid
  AND created_by = auth.uid()
)
WITH CHECK (
  has_role(auth.uid(), 'remitero'::app_role)
  AND auth.uid() <> '2184b0ef-3c4f-4ca7-bdbf-c7cc69fc4c3a'::uuid
  AND created_by = auth.uid()
);
