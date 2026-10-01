-- Add new columns for employee additional information
ALTER TABLE public.personal
  ADD COLUMN IF NOT EXISTS legajo text,
  ADD COLUMN IF NOT EXISTS situacion_laboral text DEFAULT 'blanco',
  ADD COLUMN IF NOT EXISTS banco text,
  ADD COLUMN IF NOT EXISTS numero_cuenta text;

-- Create index for legajo searches
CREATE INDEX IF NOT EXISTS idx_personal_legajo ON public.personal (legajo);