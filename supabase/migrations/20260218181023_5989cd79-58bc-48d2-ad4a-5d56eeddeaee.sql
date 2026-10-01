
-- Crear tabla de precios mensuales por producto del repartidor
CREATE TABLE public.precios_productos_mes (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  anio integer NOT NULL,
  mes integer NOT NULL CHECK (mes BETWEEN 1 AND 12),
  producto text NOT NULL,
  precio_unitario numeric NOT NULL DEFAULT 0,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE (anio, mes, producto)
);

-- Habilitar RLS
ALTER TABLE public.precios_productos_mes ENABLE ROW LEVEL SECURITY;

-- Solo admins y capataces pueden leer y gestionar precios
CREATE POLICY "Admins and capataces can manage precios_productos_mes"
ON public.precios_productos_mes
FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'capataz'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'capataz'::app_role));

-- Trigger para updated_at
CREATE TRIGGER update_precios_productos_mes_updated_at
BEFORE UPDATE ON public.precios_productos_mes
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();
