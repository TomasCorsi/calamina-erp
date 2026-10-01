-- Add payment frequency column to personal table
ALTER TABLE public.personal
  ADD COLUMN IF NOT EXISTS modalidad_pago text DEFAULT 'mensual';

COMMENT ON COLUMN public.personal.modalidad_pago IS 'Frecuencia de pago: mensual o quincenal';