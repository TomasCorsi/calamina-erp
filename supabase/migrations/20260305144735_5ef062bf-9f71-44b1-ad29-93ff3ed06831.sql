CREATE POLICY "Mecanicos personal can delete mantenimientos"
ON public.mantenimientos FOR DELETE
USING (is_personal_mecanico(auth.uid()));