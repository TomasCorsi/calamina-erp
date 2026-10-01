CREATE POLICY "Remiteros can view proveedores"
ON public.proveedores
FOR SELECT
TO authenticated
USING (has_role(auth.uid(), 'remitero'::app_role));