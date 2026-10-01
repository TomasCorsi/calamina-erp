
-- Add tipo and anticipo_porcentaje to certificados
ALTER TABLE public.certificados
  ADD COLUMN tipo text NOT NULL DEFAULT 'servicio',
  ADD COLUMN anticipo_porcentaje numeric NOT NULL DEFAULT 0;

-- Add cantidad_total and etapa to certificado_conceptos
ALTER TABLE public.certificado_conceptos
  ADD COLUMN cantidad_total numeric NOT NULL DEFAULT 0,
  ADD COLUMN etapa text;

-- Add etapa to certificado_items
ALTER TABLE public.certificado_items
  ADD COLUMN etapa text;
