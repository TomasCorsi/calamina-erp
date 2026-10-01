-- Create cotizacion_categorias table for grouping items by category/rubro
CREATE TABLE public.cotizacion_categorias (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cotizacion_id UUID NOT NULL REFERENCES public.cotizaciones(id) ON DELETE CASCADE,
  numero INTEGER NOT NULL,
  nombre TEXT NOT NULL,
  orden INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.cotizacion_categorias ENABLE ROW LEVEL SECURITY;

-- Create RLS policy
CREATE POLICY "Admins and capataces can manage cotizacion_categorias"
ON public.cotizacion_categorias
FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'capataz'::app_role));

-- Add new columns to cotizacion_items
ALTER TABLE public.cotizacion_items 
ADD COLUMN categoria_id UUID REFERENCES public.cotizacion_categorias(id) ON DELETE CASCADE,
ADD COLUMN numero TEXT,
ADD COLUMN cantidad_m2 NUMERIC DEFAULT 0,
ADD COLUMN altura_promedio NUMERIC DEFAULT 0,
ADD COLUMN cantidad_m3 NUMERIC DEFAULT 0,
ADD COLUMN total NUMERIC DEFAULT 0;

-- Create index for better query performance
CREATE INDEX idx_cotizacion_categorias_cotizacion_id ON public.cotizacion_categorias(cotizacion_id);
CREATE INDEX idx_cotizacion_items_categoria_id ON public.cotizacion_items(categoria_id);