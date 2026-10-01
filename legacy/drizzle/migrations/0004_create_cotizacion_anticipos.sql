CREATE TABLE public.cotizacion_anticipos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cotizacion_id UUID NOT NULL REFERENCES public.cotizaciones(id) ON DELETE CASCADE,
  descripcion TEXT NOT NULL DEFAULT 'Anticipo',
  tipo TEXT NOT NULL DEFAULT 'monto',
  valor NUMERIC NOT NULL DEFAULT 0,
  monto NUMERIC NOT NULL DEFAULT 0,
  orden INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_cotizacion_anticipos_cot ON public.cotizacion_anticipos(cotizacion_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.cotizacion_anticipos TO authenticated;
GRANT ALL ON public.cotizacion_anticipos TO service_role;

ALTER TABLE public.cotizacion_anticipos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can manage cotizacion_anticipos"
ON public.cotizacion_anticipos
FOR ALL
TO authenticated
USING (true)
WITH CHECK (true);

INSERT INTO public.cotizacion_anticipos (cotizacion_id, descripcion, tipo, valor, monto, orden)
SELECT id, 'Anticipo', anticipo_tipo, COALESCE(anticipo_valor, 0), COALESCE(anticipo_monto, 0), 0
FROM public.cotizaciones
WHERE anticipo_tipo IS NOT NULL AND anticipo_tipo <> 'ninguno';