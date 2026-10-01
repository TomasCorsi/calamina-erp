ALTER TABLE public.otros_gastos ADD COLUMN IF NOT EXISTS maquinaria_id UUID NULL;
CREATE INDEX IF NOT EXISTS idx_otros_gastos_maquinaria_id ON public.otros_gastos(maquinaria_id);