
ALTER TABLE public.ordenes_compra
  ADD COLUMN IF NOT EXISTS maquinaria_id uuid REFERENCES public.maquinarias(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS sector text;

ALTER TABLE public.otros_gastos
  ADD COLUMN IF NOT EXISTS sector text;
