-- Add sueldo_negro column for tracking off-the-books salary
ALTER TABLE public.personal
  ADD COLUMN IF NOT EXISTS sueldo_negro numeric DEFAULT 0;

-- Add comments for clarity
COMMENT ON COLUMN public.personal.sueldo IS 'Sueldo en blanco';
COMMENT ON COLUMN public.personal.sueldo_negro IS 'Sueldo en negro';