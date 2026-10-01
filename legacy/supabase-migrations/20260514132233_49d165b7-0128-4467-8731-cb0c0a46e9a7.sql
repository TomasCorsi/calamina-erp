ALTER TABLE public.remitos ADD COLUMN IF NOT EXISTS orden numeric;

UPDATE public.remitos SET orden = EXTRACT(EPOCH FROM created_at) WHERE orden IS NULL;

CREATE INDEX IF NOT EXISTS idx_remitos_orden ON public.remitos(orden DESC NULLS LAST);