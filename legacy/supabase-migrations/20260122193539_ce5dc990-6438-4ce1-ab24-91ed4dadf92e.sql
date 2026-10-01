-- Add RLS policy for ayudante to view otros_gastos
CREATE POLICY "Ayudantes can view otros_gastos" 
ON public.otros_gastos 
FOR SELECT 
USING (has_role(auth.uid(), 'ayudante'::app_role));

-- Add RLS policy for ayudante to insert otros_gastos
CREATE POLICY "Ayudantes can insert otros_gastos" 
ON public.otros_gastos 
FOR INSERT 
WITH CHECK (has_role(auth.uid(), 'ayudante'::app_role));

-- Add RLS policy for ayudante to update otros_gastos
CREATE POLICY "Ayudantes can update otros_gastos" 
ON public.otros_gastos 
FOR UPDATE 
USING (has_role(auth.uid(), 'ayudante'::app_role));

-- Add RLS policy for ayudante to delete otros_gastos
CREATE POLICY "Ayudantes can delete otros_gastos" 
ON public.otros_gastos 
FOR DELETE 
USING (has_role(auth.uid(), 'ayudante'::app_role));

-- Add RLS policy for ayudante to view obras (needed for the obra selector in gastos)
CREATE POLICY "Ayudantes can view obras" 
ON public.obras 
FOR SELECT 
USING (has_role(auth.uid(), 'ayudante'::app_role));