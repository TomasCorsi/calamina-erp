
-- RLS: remitero can do full CRUD on remitos
CREATE POLICY "Remiteros can manage remitos"
ON public.remitos
FOR ALL
TO authenticated
USING (has_role(auth.uid(), 'remitero'::app_role))
WITH CHECK (has_role(auth.uid(), 'remitero'::app_role));

-- RLS: remitero can view obras (for dropdowns)
CREATE POLICY "Remiteros can view obras"
ON public.obras
FOR SELECT
TO authenticated
USING (has_role(auth.uid(), 'remitero'::app_role));

-- RLS: remitero can view maquinarias (for dropdowns)
CREATE POLICY "Remiteros can view maquinarias"
ON public.maquinarias
FOR SELECT
TO authenticated
USING (has_role(auth.uid(), 'remitero'::app_role));

-- RLS: remitero can view clientes (for dropdowns)
CREATE POLICY "Remiteros can view clientes"
ON public.clientes
FOR SELECT
TO authenticated
USING (has_role(auth.uid(), 'remitero'::app_role));
