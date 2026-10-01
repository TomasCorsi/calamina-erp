DROP POLICY IF EXISTS "Remiteros can manage own remitos" ON public.remitos;

CREATE POLICY "Remiteros can manage own remitos"
ON public.remitos
FOR ALL
TO authenticated
USING (has_role(auth.uid(), 'remitero'::app_role) AND created_by = auth.uid())
WITH CHECK (has_role(auth.uid(), 'remitero'::app_role) AND created_by = auth.uid());