ALTER TABLE public.ordenes_compra
  ADD COLUMN IF NOT EXISTS percepcion_iva numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS percepcion_iibb numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS iva_porcentaje numeric NOT NULL DEFAULT 21,
  ADD COLUMN IF NOT EXISTS moneda text NOT NULL DEFAULT 'ARS';